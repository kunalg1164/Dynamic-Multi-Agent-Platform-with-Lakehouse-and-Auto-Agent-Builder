from typing import List
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from ..db.session import SessionLocal
from ..models import Agent
from ..schemas import AgentCreate, AgentRead, AgentUpdate

class AgentRegistryService:
    def __init__(self) -> None:
        self.db: Session = SessionLocal()

    def list_agents(self) -> List[AgentRead]:
        agents = self.db.query(Agent).all()
        return [AgentRead.from_orm(agent) for agent in agents]

    def create_agent(self, agent_in: AgentCreate) -> AgentRead:
        agent = Agent(
            name=agent_in.name,
            description=agent_in.description,
            domain=agent_in.domain or "general",
            prompt_template=agent_in.prompt_template,
            allowed_tools=agent_in.allowed_tools,
            status="active",
        )
        self.db.add(agent)
        try:
            self.db.commit()
            self.db.refresh(agent)
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("An agent with this name already exists.") from exc
        except SQLAlchemyError:
            self.db.rollback()
            raise
        return AgentRead.from_orm(agent)

    def update_agent(self, agent_id: int, agent_update: AgentUpdate) -> AgentRead:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent with id {agent_id} not found")

        update_data = agent_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        try:
            self.db.commit()
            self.db.refresh(agent)
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("An agent with this name already exists.") from exc
        except SQLAlchemyError:
            self.db.rollback()
            raise
        return AgentRead.from_orm(agent)

    def get_agent(self, agent_id: int) -> AgentRead:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return None
        return AgentRead.from_orm(agent)

    def delete_agent(self, agent_id: int) -> bool:
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return False
        self.db.delete(agent)
        self.db.commit()
        return True
