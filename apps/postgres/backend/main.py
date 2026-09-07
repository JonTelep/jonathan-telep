"""
FastAPI backend service for parsing PostgreSQL DDL statements.

This service provides REST API endpoints to parse DDL and return structured
schema information for ER diagram visualization.
"""

import time
from typing import Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    ParseRequest,
    ParseResponseSuccess,
    ParseResponseError,
    HealthResponse,
)
from parser import parse_ddl

# Initialize FastAPI app
app = FastAPI(
    title="PostgreSQL DDL Parser API",
    description="Parse PostgreSQL DDL statements and extract schema information for ER diagram visualization",
    version="1.0.0",
)

# Configure CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://frontend:3005",
        "http://localhost:3000",
        "http://localhost:3005",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PostgreSQL DDL Parser API",
        "version": "1.0.0",
        "endpoints": {
            "parse": "POST /api/parse - Parse PostgreSQL DDL statements",
            "health": "GET /api/health - Health check endpoint",
        },
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns:
        HealthResponse with service status
    """
    return HealthResponse(status="healthy", version="1.0.0")


@app.post("/api/parse", response_model=Union[ParseResponseSuccess, ParseResponseError])
async def parse_ddl_endpoint(request: ParseRequest):
    """
    Parse PostgreSQL DDL statements and return structured schema information.

    Args:
        request: ParseRequest containing DDL string

    Returns:
        ParseResponseSuccess with schema on success
        ParseResponseError with error details on failure

    Example:
        Request:
        ```json
        {
            "ddl": "CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255));"
        }
        ```

        Success Response:
        ```json
        {
            "valid": true,
            "schema": {
                "tables": [...],
                "relationships": [...]
            },
            "parseTime": 45
        }
        ```

        Error Response:
        ```json
        {
            "valid": false,
            "errors": [
                {
                    "line": 1,
                    "column": 10,
                    "message": "syntax error at or near ..."
                }
            ]
        }
        ```
    """
    # Measure parse time
    start_time = time.time()

    # Parse DDL
    schema, errors = parse_ddl(request.ddl)

    # Calculate parse time in milliseconds
    parse_time = int((time.time() - start_time) * 1000)

    # Return response based on result
    if errors:
        return ParseResponseError(valid=False, errors=errors)

    if schema is None:
        # Shouldn't happen, but handle gracefully
        return ParseResponseError(
            valid=False,
            errors=[
                {
                    "line": 1,
                    "column": 0,
                    "message": "Unknown parsing error occurred",
                }
            ],
        )

    return ParseResponseSuccess(valid=True, db_schema=schema, parseTime=parse_time)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return {
        "valid": False,
        "errors": [{"line": 1, "column": 0, "message": exc.detail}],
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    return {
        "valid": False,
        "errors": [
            {
                "line": 1,
                "column": 0,
                "message": f"Internal server error: {str(exc)}",
            }
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
