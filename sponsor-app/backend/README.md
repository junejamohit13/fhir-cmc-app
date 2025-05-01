# Protocol Management Backend

This is a FastAPI backend for the Protocol Management application that interfaces with a FHIR server.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run the server:

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

API documentation is automatically generated and available at:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)
