# Dynamic Multi-Agent Finance Platform

## Overview
This project is a local-first, open-source AI platform for multi-agent chat and finance intelligence. It supports:
- specialist bots (Finance, Fitness, Research, Data Analyst)
- dynamic custom bot creation
- natural language queries over structured data
- a Docker Compose local environment

## What is included
- `backend/`: Python FastAPI application with agent registry, NLQ-to-SQL, DuckDB analytics, and Mistral LLM integration
- `frontend/`: React UI scaffold with dynamic agent builder form
- `docker-compose.yml`: local deployment services (postgres, minio, backend, frontend)
- `PROJECT_PLAN.md`: project roadmap and architecture
- `TASKS.md`: tracked tasks and development plan

## Local Setup
1. Install Docker Desktop.
2. Copy `.env.example` to `.env` and add your Mistral API key.
3. Copy `frontend/.env.example` to `frontend/.env` if using the React app locally.
4. To run the backend locally with the project virtual environment:
   ```bash
   cd backend
   ../venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8003
   ```
5. Run:
   ```bash
   docker compose up --build
   ```
5. Access services:
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:3000`
   - MinIO: `http://localhost:9000`

## API Endpoints
- `GET /health`: Health check
- `GET /api/agents`: List all agents
- `POST /api/agents`: Create new agent
- `PUT /api/agents/{id}`: Update agent
- `DELETE /api/agents/{id}`: Delete agent
- `POST /api/agents/builder`: Create a new custom agent using Mistral prompt generation
- `POST /api/agents/{id}/chat`: Chat with an agent
- `GET /api/agents/{id}/sessions`: List chat sessions for an agent
- `GET /api/sessions/{id}`: Get session details
- `POST /api/agents/{id}/documents`: Upload document for semantic retrieval
- `GET /api/agents/{id}/documents`: List agent documents
- `POST /api/nlq`: Process natural language query to SQL
- `POST /api/ingest/sample-data`: Load sample stock data
- `GET /api/data/status`: Check data loading status

## Demo Scenarios

### 1. Create a Finance Advisor Agent
1. Go to `http://localhost:3000`
2. Click "Bot Builder" tab
3. Fill in:
   - Name: "Finance Advisor"
   - Description: "Provide budgeting and investment advice"
   - Domain: "finance"
   - Tags: "finance, investment, budget"
4. Click "Create Agent" or use the sample bot

### 2. Chat with the Agent
1. Switch to "Bot Chat" tab
2. Select the Finance Advisor from the dropdown
3. Type: "What's a good budget for a monthly income of $5000?"
4. The agent will respond using its specialized knowledge

### 3. Upload Documents for Enhanced Responses
1. In Bot Chat, use the agent selector
2. Upload a PDF or text file via the API: `POST /api/agents/{id}/documents`
3. Ask questions related to the uploaded content
4. The agent will retrieve relevant information from your documents

### 4. Natural Language Queries
1. Use `POST /api/nlq` with query: "What are the top performing stocks?"
2. The system will convert to SQL and query the lakehouse data

### 5. Sample Data Ingestion
1. Call `POST /api/ingest/sample-data` to load stock price samples
2. Query with NLQ: "Show me AAPL stock prices for the last 2 days"

## Development
- Backend code is in `backend/app`
- Frontend code is in `frontend/src`
- Frontend API base URL is configurable with `frontend/.env`
- Database credentials are configured in `docker-compose.yml`
- Mistral config is loaded from `.env`

## Current Status
- Phase 1 (Foundation): Complete
- Phase 2 (Data & Analytics): Complete
- Phase 3 (Dynamic Agents): In progress with UI and Mistral integration
