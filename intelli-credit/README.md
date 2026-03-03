# Intelli-Credit AI Credit Decisioning Engine

Intelli-Credit is an AI-powered Corporate Credit Appraisal system with microservice architecture. It allows users to upload financial documents, automatically extracts data, analyzes corporate risk, and generates comprehensive Credit Appraisal Memo (CAM) reports.

## Architecture & Service Communication

```
           +-----------------+
           |   Frontend      |
           |  (React/Vite)   |
           +--------+--------+
                    | (REST API)
           +--------v--------+       +-------------------+
           |    Backend      | <---> |   MongoDB         |
           | (Node/Express)  |       | (Data Storage)    |
           +--+---+---+---+--+       +-------------------+
              |   |   |   |
              |   |   |   +--------------------------+
              |   |   |                              |
      +-------v   |   v-------+              +-------v-------+
      |Extraction |   |Research |              |  CAM Generator |
      | Service   |   | Agent   |              |   Service      |
      |(Python)   |   |(Python) |              |  (Python)      |
      +-----------+   +---------+              +----------------+
              |           |
              |           |
              +--->+<-----+
                   |
           +-------v-------+
           | Risk Engine   |
           |   Service     |
           |  (Python)     |
           +---------------+
```

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js (for local development without Docker)
- Python 3.9+ (for local development without Docker)

### Environment Variables
1. Copy `.env.example` to `.env` in the root folder, backend folder, and frontend folder as necessary.
2. In production or local Docker setup, `.env` inside `backend/` and `frontend/` are mapped automatically.

### Running with Docker (Recommended)

To start the entire integrated system:

```bash
docker-compose up --build
```

Services will be mapped to the following local ports:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Extraction Service**: http://localhost:8000
- **Research Agent**: http://localhost:8001
- **Risk Engine**: http://localhost:8002
- **CAM Generator**: http://localhost:8003

### API Endpoints
- `POST /api/upload`: Upload PDFs.
- `POST /api/analyze/:companyId`: Run the AI analysis pipeline.
- `GET /api/risk/:companyId`: Retrieve risk score.
- `GET /api/cam/:companyId`: Download generated CAM report.

## System Workflow
1. User uploads PDFs via frontend.
2. Frontend calls backend `POST /api/upload`.
3. Backend stores files in local volume.
4. Backend sends file path/content to Extraction Service (`POST /extract`).
5. Extracted structured financial data is stored in MongoDB.
6. Backend calls Research Agent (`POST /research`).
7. Backend calls Risk Engine (`POST /score`).
8. Backend saves risk result and calls CAM Generator (`POST /generate`).
9. Frontend retrieves risk dashboard and CAM document link.
