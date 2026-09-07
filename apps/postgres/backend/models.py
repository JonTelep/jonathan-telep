"""
Pydantic models for request/response validation in the PostgreSQL DDL parser API.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ParseError(BaseModel):
    """Represents a DDL parsing error with location information."""

    line: int = Field(..., description="Line number where the error occurred")
    column: int = Field(..., description="Column number where the error occurred")
    message: str = Field(..., description="Error message describing the issue")


class Column(BaseModel):
    """Represents a table column with its properties."""

    name: str = Field(..., description="Column name")
    type: str = Field(..., description="PostgreSQL data type (e.g., 'integer', 'varchar(255)')")
    nullable: bool = Field(default=True, description="Whether the column allows NULL values")
    primaryKey: bool = Field(default=False, description="Whether this column is part of the primary key")
    unique: bool = Field(default=False, description="Whether this column has a UNIQUE constraint")
    default: Optional[str] = Field(default=None, description="Default value expression")
    autoIncrement: bool = Field(default=False, description="Whether column is auto-incrementing (SERIAL)")


class Constraint(BaseModel):
    """Represents a table constraint."""

    type: Literal["primary_key", "foreign_key", "unique", "check"] = Field(
        ..., description="Type of constraint"
    )
    name: Optional[str] = Field(default=None, description="Constraint name if specified")
    columns: List[str] = Field(default_factory=list, description="Columns involved in the constraint")
    definition: Optional[str] = Field(default=None, description="CHECK constraint definition")
    referencedTable: Optional[str] = Field(default=None, description="Referenced table for FK")
    referencedColumns: Optional[List[str]] = Field(default=None, description="Referenced columns for FK")
    onDelete: Optional[str] = Field(default=None, description="ON DELETE action for FK")
    onUpdate: Optional[str] = Field(default=None, description="ON UPDATE action for FK")


class Table(BaseModel):
    """Represents a database table with columns and constraints."""

    name: str = Field(..., description="Table name")
    columns: List[Column] = Field(default_factory=list, description="List of table columns")
    constraints: List[Constraint] = Field(default_factory=list, description="List of table constraints")


class Relationship(BaseModel):
    """Represents a foreign key relationship between tables."""

    fromTable: str = Field(..., description="Source table name")
    fromColumn: str = Field(..., description="Source column name")
    toTable: str = Field(..., description="Target table name")
    toColumn: str = Field(..., description="Target column name")
    type: Literal["foreign_key"] = Field(default="foreign_key", description="Relationship type")
    onDelete: Optional[str] = Field(default=None, description="ON DELETE action (CASCADE, SET NULL, etc.)")
    onUpdate: Optional[str] = Field(default=None, description="ON UPDATE action (CASCADE, SET NULL, etc.)")
    constraintName: Optional[str] = Field(default=None, description="Foreign key constraint name")


class Schema(BaseModel):
    """Represents the complete database schema."""

    tables: List[Table] = Field(default_factory=list, description="List of tables in the schema")
    relationships: List[Relationship] = Field(default_factory=list, description="List of foreign key relationships")


class ParseRequest(BaseModel):
    """Request model for DDL parsing endpoint."""

    ddl: str = Field(..., description="PostgreSQL DDL statements to parse", min_length=1)


class ParseResponseSuccess(BaseModel):
    """Successful parse response."""

    model_config = {"populate_by_name": True}

    valid: Literal[True] = True
    db_schema: Schema = Field(..., alias="schema", description="Parsed database schema")
    parseTime: int = Field(..., description="Parse time in milliseconds")


class ParseResponseError(BaseModel):
    """Error parse response."""

    valid: Literal[False] = False
    errors: List[ParseError] = Field(..., description="List of parsing errors")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(default="healthy", description="Service health status")
    version: str = Field(default="1.0.0", description="API version")
