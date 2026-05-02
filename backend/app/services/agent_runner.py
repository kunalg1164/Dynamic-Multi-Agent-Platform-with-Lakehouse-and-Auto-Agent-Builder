from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from ..db.session import SessionLocal
from ..models import Agent, ChatSession, ChatMessage
from ..schemas import ChatResponse, ChatMessageRead
from .mistral_client import MistralClient


class AgentRunnerService:
    def __init__(self) -> None:
        self.db: Session = SessionLocal()
        self.llm = MistralClient()

    def get_agent(self, agent_id: int) -> Agent:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent with id {agent_id} not found")
        return agent

    def get_or_create_session(self, agent_id: int, title: Optional[str] = None) -> ChatSession:
        session = (
            self.db.query(ChatSession)
            .filter(ChatSession.agent_id == agent_id)
            .order_by(ChatSession.created_at.desc())
            .first()
        )
        if session:
            return session
        session = ChatSession(agent_id=agent_id, title=title or f"Conversation with agent {agent_id}")
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def append_message(self, session_id: int, role: str, content: str) -> ChatMessage:
        message = ChatMessage(session_id=session_id, role=role, content=content)
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_session_messages(self, session_id: int) -> List[ChatMessage]:
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.id.asc())
            .all()
        )

    def build_prompt(self, agent: Agent, history: List[ChatMessage], user_message: str) -> str:
        system_prompt = agent.prompt_template or (
            f"You are a specialist agent named {agent.name}. {agent.description}"
        )
        conversation_lines = [f"System: {system_prompt}", ""]
        if history:
            conversation_lines.append("Conversation history:")
            for message in history:
                prefix = "User" if message.role == "user" else "Assistant"
                conversation_lines.append(f"{prefix}: {message.content}")
            conversation_lines.append("")
        conversation_lines.append(f"User: {user_message}")
        conversation_lines.append("Assistant:")
        return "\n".join(conversation_lines)

    def run_chat(self, agent_id: int, message: str, session_title: Optional[str] = None) -> ChatResponse:
        agent = self.get_agent(agent_id)
        session = self.get_or_create_session(agent_id, session_title)
        self.append_message(session.id, "user", message)

        history = self.get_session_messages(session.id)
        prompt = self.build_prompt(agent, history, message)
        assistant_text = self.llm.generate_text(prompt) or "I could not generate a response at this time."

        self.append_message(session.id, "assistant", assistant_text)

        messages = [
            ChatMessageRead(role=msg.role, content=msg.content, created_at=msg.created_at)
            for msg in history
        ]
        messages.append(ChatMessageRead(role="assistant", content=assistant_text, created_at=datetime.utcnow()))

        return ChatResponse(
            agent_id=agent.id,
            session_id=session.id,
            assistant_response=assistant_text,
            messages=messages,
        )

    def list_sessions(self, agent_id: int) -> List[ChatSession]:
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.agent_id == agent_id)
            .order_by(ChatSession.created_at.desc())
            .all()
        )

    def get_session_detail(self, session_id: int) -> ChatSession:
        session = self.db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")
        return session

    def get_session_messages(self, session_id: int) -> List[ChatMessage]:
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
