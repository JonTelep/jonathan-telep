# PostgreSQL DDL Parser & Validator API

A FastAPI backend service that parses PostgreSQL DDL statements (CREATE TABLE, ALTER TABLE) and returns structured schema information for ER diagram visualization.

## Features

- Parse PostgreSQL DDL using `pglast` library (wraps libpg_query)
- Validate SQL syntax and return clear error messages with line/column positions
- Extract comprehensive schema structure:
  - Tables with columns (name, data type, constraints)
  - Primary keys (column-level and table-level)
  - Foreign key relationships with referential actions
  - UNIQUE, NOT NULL, CHECK constraints
  - Default values and auto-increment columns
- Return JSON formatted for ER diagram rendering
- Fast performance (< 100ms for typical schemas with 20-50 tables)
- CORS enabled for local frontend development

## Technology Stack

- **Python 3.11+**
- **FastAPI** - Modern, fast web framework
- **uvicorn** - ASGI server
- **pglast** - PostgreSQL parser (Python wrapper for libpg_query)
- **pydantic** - Data validation using Python type annotations

## Installation

### Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

### Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Development Mode

Start the development server with auto-reload:

```bash
uvicorn main:app --reload
```

Or using Python directly:

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Production Mode

For production deployment:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### POST /api/parse

Parse PostgreSQL DDL statements and return structured schema information.

**Request Body:**
```json
{
  "ddl": "CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255));"
}
```

**Success Response (200 OK):**
```json
{
  "valid": true,
  "schema": {
    "tables": [
      {
        "name": "users",
        "columns": [
          {
            "name": "id",
            "type": "integer",
            "nullable": false,
            "primaryKey": true,
            "unique": false,
            "default": null,
            "autoIncrement": true
          },
          {
            "name": "email",
            "type": "varchar(255)",
            "nullable": true,
            "primaryKey": false,
            "unique": false,
            "default": null,
            "autoIncrement": false
          }
        ],
        "constraints": [
          {
            "type": "primary_key",
            "name": null,
            "columns": ["id"]
          }
        ]
      }
    ],
    "relationships": []
  },
  "parseTime": 45
}
```

**Error Response (200 OK with valid: false):**
```json
{
  "valid": false,
  "errors": [
    {
      "line": 1,
      "column": 15,
      "message": "syntax error at or near \"id\""
    }
  ]
}
```

### GET /api/health

Health check endpoint to verify service is running.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

## Example DDL

### Simple Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table with Foreign Keys

```sql
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
```

### Complex Schema with ALTER TABLE

```sql
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
```

## Testing

Run the test suite:

```bash
pytest tests/test_parser.py -v
```

Run with coverage:

```bash
pytest tests/test_parser.py --cov=. --cov-report=html
```

### Test Coverage

The test suite includes comprehensive tests for:

- Basic table creation
- All constraint types (NOT NULL, UNIQUE, CHECK, PRIMARY KEY, FOREIGN KEY)
- Column-level and table-level constraints
- Foreign keys with referential actions (CASCADE, SET NULL, etc.)
- ALTER TABLE statements
- Complex multi-table schemas
- Various PostgreSQL data types
- Error handling and validation

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── parser.py            # DDL parsing logic using pglast
├── models.py            # Pydantic models for request/response
├── requirements.txt     # Project dependencies
├── README.md            # This file
└── tests/
    ├── __init__.py
    └── test_parser.py   # Unit tests with sample DDL
```

## Schema JSON Structure

The parser returns schema information in the following structure:

```typescript
{
  tables: [
    {
      name: string,
      columns: [
        {
          name: string,
          type: string,              // PostgreSQL data type
          nullable: boolean,
          primaryKey: boolean,
          unique: boolean,
          default: string | null,
          autoIncrement: boolean
        }
      ],
      constraints: [
        {
          type: "primary_key" | "foreign_key" | "unique" | "check",
          name: string | null,
          columns: string[],
          definition: string | null,      // For CHECK constraints
          referencedTable: string | null, // For FOREIGN KEY
          referencedColumns: string[] | null,
          onDelete: string | null,
          onUpdate: string | null
        }
      ]
    }
  ],
  relationships: [
    {
      fromTable: string,
      fromColumn: string,
      toTable: string,
      toColumn: string,
      type: "foreign_key",
      onDelete: string | null,
      onUpdate: string | null,
      constraintName: string | null
    }
  ]
}
```

## Performance

- Typical schema (20-50 tables): < 100ms
- Uses async endpoints for scalability
- Efficient AST traversal using pglast

## Error Handling

The parser provides detailed error information:

- Syntax errors with precise line and column positions
- Clear error messages from PostgreSQL parser
- Graceful handling of invalid DDL
- Validation of table references in foreign keys

## CORS Configuration

By default, CORS is enabled for local development on:
- http://localhost:3000
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:5173

To modify CORS settings, edit the `CORSMiddleware` configuration in `main.py`.

## Development

### Code Style

The codebase follows Python best practices:
- Type hints for all function parameters and return values
- Comprehensive docstrings
- Clear variable and function names
- Separation of concerns (parsing logic, API layer, data models)

### Adding New Features

1. Add new functionality to `parser.py`
2. Update models in `models.py` if needed
3. Add/update API endpoints in `main.py`
4. Write tests in `tests/test_parser.py`
5. Update this README

## Troubleshooting

### Import Errors

If you encounter import errors, ensure:
1. Virtual environment is activated
2. All dependencies are installed: `pip install -r requirements.txt`
3. You're running from the `backend` directory

### pglast Installation Issues

If pglast fails to install, you may need to install build dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Install Microsoft Visual C++ Build Tools

## License

This project is part of the visualize-postgres application.

## Contributing

1. Write tests for new features
2. Ensure all tests pass: `pytest tests/`
3. Follow existing code style and documentation patterns
4. Update README for significant changes
