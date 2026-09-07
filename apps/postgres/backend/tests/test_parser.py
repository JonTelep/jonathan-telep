"""
Comprehensive unit tests for the PostgreSQL DDL parser.

Tests cover:
- Simple table creation
- Column types and constraints
- Primary keys
- Foreign keys with referential actions
- ALTER TABLE statements
- Complex multi-table schemas
- Error handling
"""

import pytest
from parser import parse_ddl, DDLParser
from models import Schema, Table, Column, Constraint, Relationship


class TestBasicTableCreation:
    """Test basic CREATE TABLE statements."""

    def test_simple_table(self):
        """Test parsing a simple table with basic columns."""
        ddl = """
        CREATE TABLE users (
            id INTEGER,
            email VARCHAR(255),
            created_at TIMESTAMP
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert schema is not None
        assert len(schema.tables) == 1

        table = schema.tables[0]
        assert table.name == "users"
        assert len(table.columns) == 3

        # Check columns
        id_col = next(c for c in table.columns if c.name == "id")
        assert id_col.type in ["int4", "integer"]  # pglast normalizes INTEGER to int4
        assert id_col.nullable is True

        email_col = next(c for c in table.columns if c.name == "email")
        assert "varchar" in email_col.type.lower()
        assert email_col.nullable is True

    def test_serial_primary_key(self):
        """Test SERIAL PRIMARY KEY column."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert schema is not None

        table = schema.tables[0]
        id_col = next(c for c in table.columns if c.name == "id")

        assert id_col.type == "integer"
        assert id_col.autoIncrement is True
        assert id_col.primaryKey is True
        assert id_col.nullable is False


class TestConstraints:
    """Test various constraint types."""

    def test_not_null_constraint(self):
        """Test NOT NULL constraint."""
        ddl = """
        CREATE TABLE users (
            id INTEGER NOT NULL,
            email VARCHAR(255) NOT NULL
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        for col in table.columns:
            assert col.nullable is False

    def test_unique_constraint(self):
        """Test UNIQUE constraint."""
        ddl = """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        email_col = next(c for c in table.columns if c.name == "email")
        assert email_col.unique is True
        assert email_col.nullable is False

    def test_default_constraint(self):
        """Test DEFAULT constraint."""
        ddl = """
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            published BOOLEAN DEFAULT false,
            views INTEGER DEFAULT 0
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        published_col = next(c for c in table.columns if c.name == "published")
        assert published_col.default is not None

        views_col = next(c for c in table.columns if c.name == "views")
        assert views_col.default is not None

    def test_table_level_primary_key(self):
        """Test table-level PRIMARY KEY constraint."""
        ddl = """
        CREATE TABLE user_roles (
            user_id INTEGER,
            role_id INTEGER,
            PRIMARY KEY (user_id, role_id)
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        # Check constraint
        pk_constraint = next((c for c in table.constraints if c.type == "primary_key"), None)
        assert pk_constraint is not None
        assert len(pk_constraint.columns) == 2
        assert "user_id" in pk_constraint.columns
        assert "role_id" in pk_constraint.columns

        # Check columns marked as primary key
        for col in table.columns:
            assert col.primaryKey is True
            assert col.nullable is False

    def test_check_constraint(self):
        """Test CHECK constraint."""
        ddl = """
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            CONSTRAINT check_title_length CHECK (length(title) > 5)
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        check_constraint = next((c for c in table.constraints if c.type == "check"), None)
        assert check_constraint is not None
        assert check_constraint.name == "check_title_length"
        assert check_constraint.definition is not None


class TestForeignKeys:
    """Test foreign key relationships."""

    def test_inline_foreign_key(self):
        """Test inline REFERENCES clause."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255)
        );

        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id)
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert len(schema.tables) == 2
        assert len(schema.relationships) == 1

        rel = schema.relationships[0]
        assert rel.fromTable == "posts"
        assert rel.fromColumn == "user_id"
        assert rel.toTable == "users"
        assert rel.toColumn == "id"
        assert rel.type == "foreign_key"

    def test_foreign_key_with_actions(self):
        """Test foreign key with ON DELETE and ON UPDATE actions."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY
        );

        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert len(schema.relationships) == 1

        rel = schema.relationships[0]
        assert rel.onDelete == "CASCADE"
        assert rel.onUpdate == "CASCADE"

    def test_table_level_foreign_key(self):
        """Test table-level FOREIGN KEY constraint."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY
        );

        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            author_id INTEGER,
            CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert len(schema.relationships) == 1

        rel = schema.relationships[0]
        assert rel.fromTable == "posts"
        assert rel.fromColumn == "author_id"
        assert rel.toTable == "users"
        assert rel.toColumn == "id"
        assert rel.onDelete == "SET NULL"
        assert rel.constraintName == "fk_author"


class TestAlterTable:
    """Test ALTER TABLE statements."""

    def test_alter_table_add_column(self):
        """Test ALTER TABLE ADD COLUMN."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY
        );

        ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        assert len(table.columns) == 2

        email_col = next(c for c in table.columns if c.name == "email")
        assert email_col.type == "varchar(255)"
        assert email_col.nullable is False

    def test_alter_table_add_constraint(self):
        """Test ALTER TABLE ADD CONSTRAINT."""
        ddl = """
        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL
        );

        ALTER TABLE posts ADD CONSTRAINT check_title_length CHECK (length(title) > 5);
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]

        check_constraint = next((c for c in table.constraints if c.type == "check"), None)
        assert check_constraint is not None
        assert check_constraint.name == "check_title_length"


class TestComplexSchemas:
    """Test complex multi-table schemas."""

    def test_blog_schema(self):
        """Test a complete blog schema."""
        ddl = """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            content TEXT,
            published BOOLEAN DEFAULT false
        );

        CREATE TABLE comments (
            id SERIAL PRIMARY KEY,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE posts ADD CONSTRAINT check_title_length CHECK (length(title) > 5);
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        assert len(schema.tables) == 3
        assert len(schema.relationships) == 3

        # Check users table
        users_table = next(t for t in schema.tables if t.name == "users")
        assert len(users_table.columns) == 3

        # Check posts table
        posts_table = next(t for t in schema.tables if t.name == "posts")
        assert len(posts_table.columns) == 5

        # Check relationships
        post_user_rel = next(
            r for r in schema.relationships
            if r.fromTable == "posts" and r.toTable == "users"
        )
        assert post_user_rel.onDelete == "CASCADE"

        comment_post_rel = next(
            r for r in schema.relationships
            if r.fromTable == "comments" and r.toTable == "posts"
        )
        assert comment_post_rel.onDelete == "CASCADE"


class TestErrorHandling:
    """Test error handling and validation."""

    def test_syntax_error(self):
        """Test handling of syntax errors."""
        ddl = "CREATE TABLE users id INTEGER"  # Missing parentheses

        schema, errors = parse_ddl(ddl)

        assert schema is None
        assert errors is not None
        assert len(errors) > 0
        assert errors[0].message is not None

    def test_invalid_sql(self):
        """Test handling of invalid SQL."""
        ddl = "SELECT * FROM users;"  # Not a DDL statement (but still valid SQL)

        # Should parse successfully but not extract any tables
        schema, errors = parse_ddl(ddl)

        # pglast will parse this successfully, just won't create tables
        assert errors is None
        assert len(schema.tables) == 0

    def test_empty_ddl(self):
        """Test handling of empty DDL."""
        ddl = ""

        schema, errors = parse_ddl(ddl)

        # Empty DDL should parse successfully but with no tables
        assert errors is None
        assert schema is not None
        assert len(schema.tables) == 0


class TestDataTypes:
    """Test various PostgreSQL data types."""

    def test_numeric_types(self):
        """Test numeric data types."""
        ddl = """
        CREATE TABLE numbers (
            tiny_int SMALLINT,
            normal_int INTEGER,
            big_int BIGINT,
            decimal_val DECIMAL(10, 2),
            float_val REAL,
            double_val DOUBLE PRECISION
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        assert len(table.columns) == 6

    def test_string_types(self):
        """Test string data types."""
        ddl = """
        CREATE TABLE strings (
            fixed_char CHAR(10),
            var_char VARCHAR(255),
            unlimited_text TEXT
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        assert len(table.columns) == 3

    def test_date_time_types(self):
        """Test date and time data types."""
        ddl = """
        CREATE TABLE timestamps (
            just_date DATE,
            just_time TIME,
            date_time TIMESTAMP,
            date_time_tz TIMESTAMPTZ
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        assert len(table.columns) == 4

    def test_boolean_type(self):
        """Test boolean data type."""
        ddl = """
        CREATE TABLE flags (
            is_active BOOLEAN DEFAULT true
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        assert len(table.columns) == 1

    def test_array_type(self):
        """Test array data type."""
        ddl = """
        CREATE TABLE arrays (
            tags TEXT[]
        );
        """

        schema, errors = parse_ddl(ddl)

        assert errors is None
        table = schema.tables[0]
        tags_col = table.columns[0]
        assert "[]" in tags_col.type or "array" in tags_col.type.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


def test_document_expressions_are_sql_not_ast_representations():
    from parser import parse_ddl
    schema, errors = parse_ddl("CREATE TABLE report (title TEXT DEFAULT 'draft', created_at TIMESTAMP DEFAULT now(), CONSTRAINT title_length CHECK (length(title) > 5));")
    assert errors is None
    table = schema.tables[0]
    assert table.columns[0].default == "'draft'"
    assert table.columns[1].default.lower() == "now()"
    assert table.constraints[0].definition == "length(title) > 5"


def test_document_preserves_composite_foreign_key_and_inline_check():
    from parser import parse_ddl
    schema, errors = parse_ddl("CREATE TABLE parent (a INT, b INT, PRIMARY KEY (a,b)); CREATE TABLE child (a INT CHECK (a > 0), b INT, CONSTRAINT parent_fk FOREIGN KEY (a,b) REFERENCES parent(a,b) ON DELETE CASCADE);")
    assert errors is None
    constraints = schema.tables[1].constraints
    assert constraints[0].definition == "a > 0"
    assert constraints[1].columns == ["a", "b"]
    assert constraints[1].referencedColumns == ["a", "b"]
    assert constraints[1].onDelete == "CASCADE"
