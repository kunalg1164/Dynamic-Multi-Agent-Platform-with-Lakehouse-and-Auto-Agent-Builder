import re
from typing import List, Optional
import httpx

SEED_SOURCES = {
    "finance": [
        "https://en.wikipedia.org/wiki/Finance",
        "https://www.investopedia.com/terms/f/finance.asp",
        "https://www.sec.gov/investor/pubs/investor.htm",
    ],
    "fitness": [
        "https://en.wikipedia.org/wiki/Physical_fitness",
        "https://www.healthline.com/health/fitness-exercise",
        "https://www.cdc.gov/physicalactivity/basics/index.htm",
    ],
    "data": [
        "https://en.wikipedia.org/wiki/Data_analysis",
        "https://en.wikipedia.org/wiki/Data_science",
        "https://www.dataversity.net/what-is-data-management/",
    ],
    "research": [
        "https://en.wikipedia.org/wiki/Research",
        "https://www.nature.com/subjects/research",
        "https://www.sciencedaily.com/",
    ],
}

class KnowledgeFetcher:
    def fetch_url_text(self, url: str, timeout: int = 10) -> Optional[str]:
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                response = client.get(url)
                response.raise_for_status()
                return self.extract_text(response.text)
        except Exception:
            return None

    def extract_text(self, html: str) -> str:
        text = re.sub(r"<script.*?</script>", "", html, flags=re.S | re.I)
        text = re.sub(r"<style.*?</style>", "", text, flags=re.S | re.I)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def fetch_domain_snippets(self, domain: str, max_sources: int = 2) -> List[str]:
        urls = SEED_SOURCES.get(domain.lower(), [])[:max_sources]
        snippets: List[str] = []
        for url in urls:
            content = self.fetch_url_text(url)
            if content:
                snippets.append(content[:1500])
        if not snippets:
            snippets.append(
                f"No external knowledge could be fetched for the {domain} domain. Use the agent description and known best practices instead."
            )
        return snippets
