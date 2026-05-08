from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from ..db.session import SessionLocal
from ..models import Agent, ChatSession, ChatMessage
from ..schemas import ChatResponse, ChatMessageRead, ChatSource
from .mistral_client import MistralClient
from .semantic_retrieval import SemanticRetrievalService
from .duckdb_analytics import DuckDBAnalytics


class AgentRunnerService:
    def __init__(self) -> None:
        self.db: Session = SessionLocal()
        self.llm = MistralClient()
        self.analytics = DuckDBAnalytics()
        self.retrieval = SemanticRetrievalService(self.analytics)

    def get_agent(self, agent_id: int) -> Agent:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent with id {agent_id} not found")
        return agent

    def get_or_create_session(self, agent_id: int, title: Optional[str] = None) -> ChatSession:
        # If caller explicitly asks for a new titled chat, create a fresh session.
        if title:
            session = ChatSession(agent_id=agent_id, title=title)
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            return session

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

    def build_prompt(
        self,
        agent: Agent,
        history: List[ChatMessage],
        user_message: str,
        use_documents: bool = True,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        base_prompt = agent.prompt_template or (
            f"You are a specialist agent named {agent.name}. {agent.description}"
        )

        relevant_chunks: List[Dict[str, Any]] = []
        doc_inventory = self.retrieval.get_agent_documents(agent.id) if use_documents else []
        if use_documents:
            relevant_chunks = self.retrieval.retrieve_relevant_chunks(user_message, agent.id, top_k=5)

        behavior_instructions = [
            "You are an interactive, user-helpful assistant.",
            "Always try to answer directly and clearly with practical steps/examples when useful.",
            "If document context is provided below, treat it as trusted source material and use it in your answer.",
            "Do not claim you cannot access files or tools when document context is present.",
            "If context is insufficient, say what is missing and ask one concise follow-up question.",
            "When using document context, cite filename(s) inline like [source: filename.ext].",
        ]

        knowledge_lines: List[str] = []
        if relevant_chunks:
            knowledge_lines.append("Relevant context from uploaded documents:")
            for chunk in relevant_chunks:
                filename = chunk.get("filename", "unknown")
                chunk_text = str(chunk.get("chunk_text", "")).strip()
                if chunk_text:
                    knowledge_lines.append(f"- [{filename}] {chunk_text[:900]}")
        else:
            knowledge_lines.append("No relevant retrieved chunks were found for this query.")
            if doc_inventory:
                knowledge_lines.append(
                    "The agent still has uploaded files available: "
                    + ", ".join(doc.get("filename", "unknown") for doc in doc_inventory[:10])
                )
            else:
                knowledge_lines.append("No uploaded files are currently available for this agent.")

        if not use_documents:
            knowledge_lines = ["Document retrieval disabled by user for this message."]

        system_prompt = (
            "Base agent persona/instructions:\n"
            f"{base_prompt}\n\n"
            "Behavior requirements:\n"
            + "\n".join(f"- {line}" for line in behavior_instructions)
            + "\n\n"
            + "\n".join(knowledge_lines)
        )

        conversation_lines = [f"System: {system_prompt}", ""]
        if history:
            conversation_lines.append("Conversation history:")
            # Keep prompt focused on recent turns to avoid stale behavioral drift.
            for message in history[-12:]:
                prefix = "User" if message.role == "user" else "Assistant"
                conversation_lines.append(f"{prefix}: {message.content}")
            conversation_lines.append("")
        conversation_lines.append(f"User: {user_message}")
        conversation_lines.append("Assistant:")
        return "\n".join(conversation_lines), relevant_chunks

    def run_chat(
        self,
        agent_id: int,
        message: str,
        session_title: Optional[str] = None,
        use_documents: bool = True,
    ) -> ChatResponse:
        agent = self.get_agent(agent_id)
        session = self.get_or_create_session(agent_id, session_title)
        self.append_message(session.id, "user", message)

        history = self.get_session_messages(session.id)
        prompt, sources = self.build_prompt(agent, history, message, use_documents=use_documents)
        assistant_text = self.llm.generate_text(prompt) or "I could not generate a response at this time."

        self.append_message(session.id, "assistant", assistant_text)

        messages = [
            ChatMessageRead(role=msg.role, content=msg.content, created_at=msg.created_at)
            for msg in history
        ]
        messages.append(ChatMessageRead(role="assistant", content=assistant_text, created_at=datetime.utcnow()))

        formatted_sources = []
        for src in sources[:5]:
            snippet = str(src.get("chunk_text", "")).strip()
            filename = str(src.get("filename", "unknown"))
            if snippet:
                formatted_sources.append(
                    ChatSource(
                        filename=filename,
                        snippet=snippet[:280],
                        similarity=src.get("similarity"),
                    )
                )

        return ChatResponse(
            agent_id=agent.id,
            session_id=session.id,
            assistant_response=assistant_text,
            messages=messages,
            sources=formatted_sources,
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
