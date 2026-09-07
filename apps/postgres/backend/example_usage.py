"""
Example usage of the PostgreSQL DDL Parser API.

This script demonstrates how to use the parser programmatically
without running the web server.
"""

from parser import parse_ddl
import json

# Example 1: Simple table
print("=" * 70)
print("Example 1: Simple table with basic columns")
print("=" * 70)

ddl1 = """
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
"""

schema1, errors1 = parse_ddl(ddl1)

if errors1:
    print("Errors:", errors1)
else:
    print(json.dumps(schema1.model_dump(), indent=2))

# Example 2: Tables with foreign keys
print("\n" + "=" * 70)
print("Example 2: Tables with foreign key relationships")
print("=" * 70)

ddl2 = """
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false
);
"""

schema2, errors2 = parse_ddl(ddl2)

if errors2:
    print("Errors:", errors2)
else:
    print("Tables:", len(schema2.tables))
    print("Relationships:", len(schema2.relationships))
    print("\nRelationships:")
    for rel in schema2.relationships:
        print(f"  {rel.fromTable}.{rel.fromColumn} -> {rel.toTable}.{rel.toColumn}")
        print(f"    ON DELETE: {rel.onDelete}, ON UPDATE: {rel.onUpdate}")

# Example 3: Complex schema with constraints
print("\n" + "=" * 70)
print("Example 3: Complex schema with multiple constraints")
print("=" * 70)

ddl3 = """
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

ALTER TABLE posts ADD CONSTRAINT check_title_length
    CHECK (length(title) > 5);
"""

schema3, errors3 = parse_ddl(ddl3)

if errors3:
    print("Errors:", errors3)
else:
    print(f"Tables: {len(schema3.tables)}")
    print(f"Relationships: {len(schema3.relationships)}")

    print("\nTable Details:")
    for table in schema3.tables:
        print(f"\n  {table.name}:")
        print(f"    Columns: {len(table.columns)}")
        for col in table.columns:
            constraints = []
            if col.primaryKey:
                constraints.append("PK")
            if col.unique:
                constraints.append("UNIQUE")
            if not col.nullable:
                constraints.append("NOT NULL")
            constraint_str = f" ({', '.join(constraints)})" if constraints else ""
            print(f"      - {col.name}: {col.type}{constraint_str}")

        if table.constraints:
            print(f"    Constraints: {len(table.constraints)}")
            for constraint in table.constraints:
                print(f"      - {constraint.type}: {constraint.name or 'unnamed'}")

# Example 4: Error handling
print("\n" + "=" * 70)
print("Example 4: Error handling with invalid DDL")
print("=" * 70)

ddl4 = "CREATE TABLE users id INTEGER"  # Missing parentheses

schema4, errors4 = parse_ddl(ddl4)

if errors4:
    print("Parse errors detected:")
    for error in errors4:
        print(f"  Line {error.line}, Column {error.column}: {error.message}")
else:
    print("Unexpectedly parsed successfully")

print("\n" + "=" * 70)
print("Examples completed!")
print("=" * 70)
