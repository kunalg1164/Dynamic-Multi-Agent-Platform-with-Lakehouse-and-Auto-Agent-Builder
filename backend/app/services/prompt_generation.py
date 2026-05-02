from typing import List, Optional

class PromptGenerator:
    @staticmethod
    def build_seed_prompt(name: str, description: str, domain: str, tags: Optional[List[str]], knowledge_snippets: List[str]) -> str:
        tool_list = PromptGenerator.select_tools_for_domain(domain)
        info_block = "\n\n".join(knowledge_snippets)
        return (
            f"Create a concise system prompt for a chatbot agent with the following details:\n"
            f"Name: {name}\n"
            f"Domain: {domain}\n"
            f"Description: {description}\n"
            f"Tags: {', '.join(tags) if tags else 'none'}\n\n"
            "Use the provided knowledge snippets to inform the prompt. "
            "Produce output that can be used as the agent's system prompt. "
            "Include the allowed tools and ensure the tone is helpful, accurate, and domain-specific.\n\n"
            "Knowledge snippets:\n" + info_block + "\n\n"
            "Allowed tools: " + ", ".join(tool_list) + ".\n"
            "Only return the exact system prompt text and avoid any metadata or explanation."
        )

    @staticmethod
    def generate_prompt(name: str, description: str, domain: str, tags: Optional[List[str]], knowledge_snippets: List[str]) -> str:
        tool_list = PromptGenerator.select_tools_for_domain(domain)
        info_block = "\n\n".join(knowledge_snippets)
        return (
            f"You are {name}, a specialist {domain} assistant.\n"
            f"Description: {description}\n"
            f"Tags: {', '.join(tags) if tags else 'none'}\n\n"
            "Use the knowledge below to answer user questions accurately and concisely. "
            "When useful, reference the domain knowledge and provide examples. "
            "If the user request is outside your specialist domain, say you are a domain specialist and suggest focusing the question.\n\n"
            "Knowledge sources:\n" + info_block + "\n\n"
            "Allowed tools: " + ", ".join(tool_list) + ".\n"
            "Answer in a helpful, clear, and polite style."
        )

    @staticmethod
    def select_tools_for_domain(domain: str) -> List[str]:
        domain_lower = domain.lower()
        if "finance" in domain_lower:
            return ["finance_data_query", "news_search", "portfolio_analysis"]
        if "fitness" in domain_lower:
            return ["exercise_planner", "nutrition_lookup", "health_tips"]
        if "data" in domain_lower or "analytics" in domain_lower:
            return ["sql_query", "data_summary", "chart_generator"]
        if "research" in domain_lower:
            return ["web_search", "summary_tool", "citation_finder"]
        return ["web_search", "summary_tool"]
