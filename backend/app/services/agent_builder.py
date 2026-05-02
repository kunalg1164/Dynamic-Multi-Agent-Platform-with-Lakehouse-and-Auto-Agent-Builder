from typing import Optional
from ..schemas import AgentBuilderRequest, AgentCreate, AgentRead
from .agent_registry import AgentRegistryService
from .knowledge_fetcher import KnowledgeFetcher
from .prompt_generation import PromptGenerator
from .mistral_client import MistralClient

DOMAIN_KEYWORDS = {
    "finance": ["finance", "stock", "investment", "market", "bank", "portfolio", "earnings"],
    "fitness": ["fitness", "exercise", "workout", "diet", "health", "training", "nutrition"],
    "data": ["data", "analytics", "analysis", "dashboard", "sql", "metrics"],
    "research": ["research", "study", "papers", "reports", "literature", "knowledge"],
}

class AgentBuilderService:
    def __init__(self) -> None:
        self.registry = AgentRegistryService()
        self.fetcher = KnowledgeFetcher()
        self.prompt_generator = PromptGenerator()
        self.llm = MistralClient()

    def infer_domain(self, name: str, description: str, tags: Optional[list[str]] = None) -> str:
        text = f"{name} {description} {' '.join(tags or [])}".lower()
        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return domain
        return "general"

    def build_agent(self, request: AgentBuilderRequest) -> AgentRead:
        domain = request.domain or self.infer_domain(request.name, request.description, request.tags)
        knowledge = self.fetcher.fetch_domain_snippets(domain)
        draft_prompt = self.prompt_generator.build_seed_prompt(
            request.name,
            request.description,
            domain,
            request.tags,
            knowledge,
        )
        prompt_template = self.llm.generate_text(draft_prompt)
        if not prompt_template:
            prompt_template = self.prompt_generator.generate_prompt(
                request.name,
                request.description,
                domain,
                request.tags,
                knowledge,
            )
        agent_data = request.dict()
        agent_data["domain"] = domain
        agent_data["prompt_template"] = prompt_template
        agent_data["allowed_tools"] = self.prompt_generator.select_tools_for_domain(domain)
        agent_create = AgentCreate(**agent_data)
        return self.registry.create_agent(agent_create)
