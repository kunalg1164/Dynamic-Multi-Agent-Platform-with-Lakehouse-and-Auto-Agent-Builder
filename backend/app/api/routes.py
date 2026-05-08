from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from ..schemas import (
    AgentCreate,
    AgentRead,
    AgentUpdate,
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
from ..services.semantic_retrieval import SemanticRetrievalService
from ..services.background_processing import BackgroundProcessingService
from ..models import Agent

api_router = APIRouter()
agent_service = AgentRegistryService()
builder_service = AgentBuilderService()
runner_service = AgentRunnerService()
analytics = DuckDBAnalytics()
nlq_service = NLQToSQLService(analytics)
ingestion_service = FinanceDataIngestion(analytics)
retrieval_service = SemanticRetrievalService(analytics)
background_service = BackgroundProcessingService(retrieval_service)

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

@api_router.put("/agents/{agent_id}", response_model=AgentRead)
def update_agent(agent_id: int, agent_update: AgentUpdate) -> AgentRead:
    try:
        return agent_service.update_agent(agent_id, agent_update)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@api_router.delete("/agents/{agent_id}")
def delete_agent(agent_id: int):
    if not agent_service.delete_agent(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted successfully"}

@api_router.post("/agents/builder", response_model=AgentRead)
def build_agent(agent_request: AgentBuilderRequest) -> AgentRead:
    try:
        return builder_service.build_agent(agent_request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@api_router.post("/agents/{agent_id}/chat", response_model=ChatResponse)
def agent_chat(agent_id: int, request: ChatRequest) -> ChatResponse:
    try:
        return runner_service.run_chat(
            agent_id,
            request.message,
            request.session_title,
            use_documents=request.use_documents,
        )
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

@api_router.post("/agents/{agent_id}/documents")
async def upload_document(agent_id: int, file: UploadFile = File(...)):
    """Upload a document for an agent and queue it for lakehouse processing."""
    try:
        content = await file.read()
        content_type = file.content_type or "application/octet-stream"

        # Check if agent exists via SQLAlchemy query directly
        agent_exists = agent_service.db.query(Agent).filter(Agent.id == agent_id).first() is not None
        if not agent_exists:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Store document in raw layer
        doc_id = retrieval_service.store_document(agent_id, file.filename, content, content_type)

        # Queue for background processing
        await background_service.enqueue_document(doc_id, agent_id, domain="finance")  # Default domain

        return {
            "message": f"Document {file.filename} uploaded and queued for processing",
            "document_id": doc_id,
            "status": "processing"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@api_router.get("/agents/{agent_id}/documents")
def list_agent_documents(agent_id: int):
    """List all documents uploaded for an agent with processing status."""
    return retrieval_service.get_agent_documents(agent_id)

@api_router.delete("/agents/{agent_id}/documents/{document_id}")
def delete_agent_document(agent_id: int, document_id: int):
    """Delete a document uploaded for an agent."""
    deleted = retrieval_service.remove_document(agent_id, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document removed successfully", "document_id": document_id}

@api_router.get("/processing/status")
def get_processing_status():
    """Get overall lakehouse processing status."""
    return retrieval_service.get_processing_status()

@api_router.get("/processing/queue")
async def get_queue_status():
    """Get background processing queue status."""
    return await background_service.get_queue_status()
