from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas import (
    AgentCreate,
    AgentRead,
    AgentBuilderRequest,
    ChatMessageRead,
    ChatRequest,
    ChatResponse,
    ChatSessionRead,
    ChatSessionDetail,
    NLQRequest,
    NLQResponse,
)
from ..services.agent_registry import AgentRegistryService
from ..services.agent_builder import AgentBuilderService
from ..services.agent_runner import AgentRunnerService
from ..services.nlq_to_sql import NLQToSQLService
from ..services.duckdb_analytics import DuckDBAnalytics
from ..services.finance_ingestion import FinanceDataIngestion

api_router = APIRouter()
agent_service = AgentRegistryService()
builder_service = AgentBuilderService()
runner_service = AgentRunnerService()
analytics = DuckDBAnalytics()
nlq_service = NLQToSQLService(analytics)
ingestion_service = FinanceDataIngestion(analytics)

@api_router.get("/agents", response_model=List[AgentRead])
def list_agents() -> List[AgentRead]:
    return agent_service.list_agents()

@api_router.post("/agents", response_model=AgentRead)
def create_agent(agent_in: AgentCreate) -> AgentRead:
    try:
        agent = agent_service.create_agent(agent_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not agent:
        raise HTTPException(status_code=400, detail="Unable to create agent")
    return agent

@api_router.post("/agents/builder", response_model=AgentRead)
def build_agent(agent_request: AgentBuilderRequest) -> AgentRead:
    try:
        return builder_service.build_agent(agent_request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@api_router.post("/agents/{agent_id}/chat", response_model=ChatResponse)
def agent_chat(agent_id: int, request: ChatRequest) -> ChatResponse:
    try:
        return runner_service.run_chat(agent_id, request.message, request.session_title)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@api_router.get("/agents/{agent_id}/sessions", response_model=List[ChatSessionRead])
def list_agent_sessions(agent_id: int) -> List[ChatSessionRead]:
    sessions = runner_service.list_sessions(agent_id)
    result = []
    for session in sessions:
        message_count = len(runner_service.get_session_messages(session.id))
        result.append(ChatSessionRead(
            id=session.id,
            agent_id=session.agent_id,
            title=session.title,
            created_at=session.created_at,
            message_count=message_count
        ))
    return result

@api_router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session_detail(session_id: int) -> ChatSessionDetail:
    try:
        session = runner_service.get_session_detail(session_id)
        messages = runner_service.get_session_messages(session_id)
        return ChatSessionDetail(
            id=session.id,
            agent_id=session.agent_id,
            title=session.title,
            created_at=session.created_at,
            messages=[
                ChatMessageRead(role=msg.role, content=msg.content, created_at=msg.created_at)
                for msg in messages
            ]
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@api_router.post("/nlq", response_model=NLQResponse)
def process_nlq(request: NLQRequest) -> NLQResponse:
    result = nlq_service.execute_nlq(request.query, request.table_name)
    return NLQResponse(**result)

@api_router.post("/ingest/sample-data")
def ingest_sample_data():
    ingestion_service.load_sample_stock_data()
    return {"message": "Sample data ingested successfully"}

@api_router.get("/data/status")
def get_data_status():
    return ingestion_service.get_sample_data_status()
