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
- `POST /api/agents/builder`: Create a new custom agent using Mistral prompt generation
- `POST /api/nlq`: Process natural language query to SQL
- `POST /api/ingest/sample-data`: Load sample stock data
- `GET /api/data/status`: Check data loading status

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
