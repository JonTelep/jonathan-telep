"""
PostgreSQL DDL parser using pglast library.

This module provides functionality to parse PostgreSQL DDL statements and extract
structured schema information including tables, columns, constraints, and relationships.
"""

from typing import Dict, List, Optional, Any, Tuple
import pglast
from pglast import ast, enums
from pglast.stream import RawStream
from models import (
    Schema,
    Table,
    Column,
    Constraint,
    Relationship,
    ParseError,
)


class DDLParser:
    """Parser for PostgreSQL DDL statements."""

    def __init__(self):
        """Initialize the DDL parser."""
        self.tables: Dict[str, Table] = {}
        self.relationships: List[Relationship] = []

    def parse(self, ddl: str) -> Tuple[Optional[Schema], Optional[List[ParseError]]]:
        """
        Parse PostgreSQL DDL statements and extract schema information.

        Args:
            ddl: PostgreSQL DDL statements as a string

        Returns:
            Tuple of (Schema, None) on success or (None, List[ParseError]) on failure
        """
        try:
            # Parse the SQL using pglast
            statements = pglast.parse_sql(ddl)

            # Reset state
            self.tables = {}
            self.relationships = []

            # Process each statement
            for stmt in statements:
                self._process_statement(stmt.stmt)

            # Build schema object
            schema = Schema(
                tables=list(self.tables.values()), relationships=self.relationships
            )

            return schema, None

        except pglast.parser.ParseError as e:
            # Extract error information
            error = ParseError(
                line=getattr(e, "lineno", 1),
                column=getattr(e, "cursorpos", 0),
                message=str(e),
            )
            return None, [error]

        except Exception as e:
            # Handle other unexpected errors
            error = ParseError(line=1, column=0, message=f"Unexpected error: {str(e)}")
            return None, [error]

    def _process_statement(self, stmt: Any) -> None:
        """
        Process a single parsed statement.

        Args:
            stmt: Parsed statement node from pglast
        """
        if isinstance(stmt, ast.CreateStmt):
            self._process_create_table(stmt)
        elif isinstance(stmt, ast.AlterTableStmt):
            self._process_alter_table(stmt)
        elif isinstance(stmt, ast.IndexStmt):
            self._process_index(stmt)

    def _process_create_table(self, stmt: ast.CreateStmt) -> None:
        """
        Process a CREATE TABLE statement.

        Args:
            stmt: CreateStmt node from pglast
        """
        # Extract table name
        table_name = self._get_relation_name(stmt.relation)

        # Initialize table
        table = Table(name=table_name, columns=[], constraints=[])

        # Add table to self.tables early so constraints can reference it
        self.tables[table_name] = table

        # Process table elements (columns and constraints)
        if stmt.tableElts:
            for element in stmt.tableElts:
                if isinstance(element, ast.ColumnDef):
                    column = self._process_column_def(element, table_name)
                    table.columns.append(column)
                elif isinstance(element, ast.Constraint):
                    constraint = self._process_constraint(element, table_name)
                    if constraint:
                        table.constraints.append(constraint)

    def _process_column_def(self, col_def: ast.ColumnDef, table_name: str) -> Column:
        """
        Process a column definition.

        Args:
            col_def: ColumnDef node from pglast
            table_name: Name of the table containing this column

        Returns:
            Column object with extracted information
        """
        column_name = col_def.colname
        column_type = self._get_column_type(col_def.typeName)

        # Initialize column properties
        nullable = True
        primary_key = False
        unique = False
        default_value = None
        auto_increment = False

        # Check if type is SERIAL (auto-increment)
        if column_type.lower() in ("serial", "bigserial", "smallserial"):
            auto_increment = True
            nullable = False
            # Convert SERIAL to its underlying type
            type_map = {
                "serial": "integer",
                "bigserial": "bigint",
                "smallserial": "smallint",
            }
            column_type = type_map.get(column_type.lower(), column_type)

        # Process column constraints
        if col_def.constraints:
            for constraint in col_def.constraints:
                if isinstance(constraint, ast.Constraint):
                    if constraint.contype == enums.ConstrType.CONSTR_NOTNULL:
                        nullable = False
                    elif constraint.contype == enums.ConstrType.CONSTR_NULL:
                        nullable = True
                    elif constraint.contype == enums.ConstrType.CONSTR_PRIMARY:
                        primary_key = True
                        nullable = False
                    elif constraint.contype == enums.ConstrType.CONSTR_UNIQUE:
                        unique = True
                    elif constraint.contype == enums.ConstrType.CONSTR_CHECK:
                        self.tables[table_name].constraints.append(Constraint(
                            type="check", name=constraint.conname, columns=[column_name],
                            definition=self._node_to_string(constraint.raw_expr),
                        ))
                    elif constraint.contype == enums.ConstrType.CONSTR_DEFAULT:
                        default_value = self._get_default_value(constraint.raw_expr)
                    elif constraint.contype == enums.ConstrType.CONSTR_FOREIGN:
                        # Handle inline foreign key
                        self._process_foreign_key_constraint(
                            constraint, table_name, [column_name]
                        )

        return Column(
            name=column_name,
            type=column_type,
            nullable=nullable,
            primaryKey=primary_key,
            unique=unique,
            default=default_value,
            autoIncrement=auto_increment,
        )

    def _process_constraint(
        self, constraint: ast.Constraint, table_name: str
    ) -> Optional[Constraint]:
        """
        Process a table-level constraint.

        Args:
            constraint: Constraint node from pglast
            table_name: Name of the table containing this constraint

        Returns:
            Constraint object or None if constraint is a foreign key
        """
        constraint_name = constraint.conname if constraint.conname else None

        if constraint.contype == enums.ConstrType.CONSTR_PRIMARY:
            # Primary key constraint
            columns = [key.sval for key in constraint.keys if hasattr(key, 'sval')]

            # Mark columns as primary keys
            for col in self.tables.get(table_name, Table(name=table_name)).columns:
                if col.name in columns:
                    col.primaryKey = True
                    col.nullable = False

            return Constraint(
                type="primary_key", name=constraint_name, columns=columns
            )

        elif constraint.contype == enums.ConstrType.CONSTR_UNIQUE:
            # Unique constraint
            columns = [key.sval for key in constraint.keys if hasattr(key, 'sval')]

            # If single column, mark it as unique
            if len(columns) == 1 and table_name in self.tables:
                for col in self.tables[table_name].columns:
                    if col.name == columns[0]:
                        col.unique = True

            return Constraint(type="unique", name=constraint_name, columns=columns)

        elif constraint.contype == enums.ConstrType.CONSTR_FOREIGN:
            # Foreign key constraint
            # Table-level FK uses fk_attrs, column-level uses keys
            if constraint.fk_attrs:
                columns = [key.sval for key in constraint.fk_attrs if hasattr(key, 'sval')]
            elif constraint.keys:
                columns = [key.sval for key in constraint.keys if hasattr(key, 'sval')]
            else:
                columns = []
            self._process_foreign_key_constraint(constraint, table_name, columns)
            return Constraint(
                type="foreign_key", name=constraint_name, columns=columns,
                referencedTable=self._get_relation_name(constraint.pktable),
                referencedColumns=[attr.sval for attr in (constraint.pk_attrs or ())],
                onDelete=self._get_fk_action(constraint.fk_del_action),
                onUpdate=self._get_fk_action(constraint.fk_upd_action),
            )

        elif constraint.contype == enums.ConstrType.CONSTR_CHECK:
            # Check constraint
            check_expr = self._node_to_string(constraint.raw_expr)
            return Constraint(
                type="check", name=constraint_name, columns=[], definition=check_expr
            )

        return None

    def _process_foreign_key_constraint(
        self, constraint: ast.Constraint, from_table: str, from_columns: List[str]
    ) -> None:
        """
        Process a foreign key constraint and create relationship.

        Args:
            constraint: Constraint node from pglast
            from_table: Source table name
            from_columns: List of source column names
        """
        # Get referenced table
        to_table = self._get_relation_name(constraint.pktable)

        # Get referenced columns
        to_columns = []
        if constraint.pk_attrs:
            to_columns = [attr.sval for attr in constraint.pk_attrs if hasattr(attr, 'sval')]
        else:
            # If not specified, references primary key of target table
            to_columns = ["id"]  # Default assumption

        # Get referential actions
        on_delete = self._get_fk_action(constraint.fk_del_action)
        on_update = self._get_fk_action(constraint.fk_upd_action)

        # Create relationships for each column pair
        for from_col, to_col in zip(from_columns, to_columns):
            relationship = Relationship(
                fromTable=from_table,
                fromColumn=from_col,
                toTable=to_table,
                toColumn=to_col,
                type="foreign_key",
                onDelete=on_delete,
                onUpdate=on_update,
                constraintName=constraint.conname if constraint.conname else None,
            )
            self.relationships.append(relationship)

    def _process_alter_table(self, stmt: ast.AlterTableStmt) -> None:
        """
        Process an ALTER TABLE statement.

        Args:
            stmt: AlterTableStmt node from pglast
        """
        table_name = self._get_relation_name(stmt.relation)

        # Ensure table exists
        if table_name not in self.tables:
            self.tables[table_name] = Table(name=table_name, columns=[], constraints=[])

        table = self.tables[table_name]

        # Process each ALTER command
        if stmt.cmds:
            for cmd in stmt.cmds:
                if isinstance(cmd, ast.AlterTableCmd):
                    self._process_alter_table_cmd(cmd, table_name, table)

    def _process_alter_table_cmd(
        self, cmd: ast.AlterTableCmd, table_name: str, table: Table
    ) -> None:
        """
        Process an ALTER TABLE command.

        Args:
            cmd: AlterTableCmd node from pglast
            table_name: Name of the table being altered
            table: Table object being modified
        """
        if cmd.subtype == enums.AlterTableType.AT_AddColumn:
            # Add column
            if isinstance(cmd.def_, ast.ColumnDef):
                column = self._process_column_def(cmd.def_, table_name)
                table.columns.append(column)

        elif cmd.subtype == enums.AlterTableType.AT_AddConstraint:
            # Add constraint
            if isinstance(cmd.def_, ast.Constraint):
                constraint = self._process_constraint(cmd.def_, table_name)
                if constraint:
                    table.constraints.append(constraint)

    def _process_index(self, stmt: ast.IndexStmt) -> None:
        """
        Process a CREATE INDEX statement.

        Args:
            stmt: IndexStmt node from pglast
        """
        # For now, we'll skip index processing as it's not critical for ER diagrams
        # Can be extended later if needed
        pass

    def _get_relation_name(self, relation: ast.RangeVar) -> str:
        """
        Extract table name from RangeVar node.

        Args:
            relation: RangeVar node

        Returns:
            Table name as string
        """
        if relation.schemaname:
            return f"{relation.schemaname}.{relation.relname}"
        return relation.relname

    def _get_column_type(self, type_name: ast.TypeName) -> str:
        """
        Extract column type from TypeName node.

        Args:
            type_name: TypeName node

        Returns:
            Type string (e.g., 'integer', 'varchar(255)')
        """
        if not type_name.names:
            return "unknown"

        # Get base type name
        type_parts = [name.sval for name in type_name.names if hasattr(name, 'sval')]
        base_type = type_parts[-1] if type_parts else "unknown"

        # Handle type modifiers (e.g., varchar(255))
        if type_name.typmods:
            mods = []
            for mod in type_name.typmods:
                mod_str = self._node_to_string(mod)
                mods.append(mod_str)
            return f"{base_type}({','.join(mods)})"

        # Handle array types
        if type_name.arrayBounds:
            return f"{base_type}[]"

        return base_type

    def _get_default_value(self, expr: Any) -> Optional[str]:
        """
        Extract default value from expression node.

        Args:
            expr: Expression node

        Returns:
            Default value as string or None
        """
        if expr is None:
            return None
        return self._node_to_string(expr)

    def _get_fk_action(self, action: Optional[str]) -> Optional[str]:
        """
        Convert pglast FK action to readable string.

        Args:
            action: FK action character code

        Returns:
            Action string like 'CASCADE', 'SET NULL', etc.
        """
        if action is None or action == "a":  # 'a' = NO ACTION
            return None

        action_map = {
            "r": "RESTRICT",
            "c": "CASCADE",
            "n": "SET NULL",
            "d": "SET DEFAULT",
        }

        return action_map.get(action, None)

    def _node_to_string(self, node: Any) -> str:
        """
        Convert AST node to string representation.

        Args:
            node: AST node

        Returns:
            String representation of the node
        """
        try:
            # Use pglast's deparse functionality
            return RawStream()(node)
        except Exception:
            # Fallback to simple string conversion
            if isinstance(node, ast.A_Const):
                if hasattr(node.val, 'ival'):
                    return str(node.val.ival)
                elif hasattr(node.val, 'fval'):
                    return str(node.val.fval)
                elif hasattr(node.val, 'sval'):
                    return f"'{node.val.sval}'"
            return str(node)


def parse_ddl(ddl: str) -> Tuple[Optional[Schema], Optional[List[ParseError]]]:
    """
    Convenience function to parse DDL.

    Args:
        ddl: PostgreSQL DDL statements

    Returns:
        Tuple of (Schema, None) on success or (None, List[ParseError]) on failure
    """
    parser = DDLParser()
    return parser.parse(ddl)
