from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AgentBase(BaseModel):
    name: str
    description: str
    domain: Optional[str] = None

class AgentCreate(AgentBase):
    prompt_template: Optional[str] = None
    allowed_tools: Optional[List[str]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    prompt_template: Optional[str] = None
    allowed_tools: Optional[List[str]] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True

class AgentRead(AgentBase):
    id: int
    prompt_template: Optional[str] = None
    allowed_tools: Optional[List[str]] = None
    status: str

    class Config:
        from_attributes = True

class AgentBuilderRequest(AgentBase):
    tags: Optional[List[str]] = None

class ChatMessageRead(BaseModel):
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    session_title: Optional[str] = None
    use_documents: bool = True

class ChatSource(BaseModel):
    filename: str
    snippet: str
    similarity: Optional[float] = None

class ChatResponse(BaseModel):
    agent_id: int
    session_id: int
    assistant_response: str
    messages: List[ChatMessageRead]
    sources: List[ChatSource] = []

class ChatSessionRead(BaseModel):
    id: int
    agent_id: int
    title: Optional[str] = None
    created_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True

class ChatSessionDetail(BaseModel):
    id: int
    agent_id: int
    title: Optional[str] = None
    created_at: datetime
    messages: List[ChatMessageRead]

    class Config:
        from_attributes = True

class NLQRequest(BaseModel):
    query: str
    table_name: Optional[str] = None

class NLQResponse(BaseModel):
    query: str
    sql: str
    results: List[Dict[str, Any]]
    explanation: Optional[str] = None
    error: Optional[str] = None
