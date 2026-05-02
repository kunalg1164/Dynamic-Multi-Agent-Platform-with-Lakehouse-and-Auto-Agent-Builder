import httpx
from typing import Any, Dict, Optional
from ..core.config import get_settings

class MistralClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.mistral_api_key
        self.model = settings.mistral_model or "mistral-small"
        self.endpoint = settings.mistral_endpoint.rstrip('/') if settings.mistral_endpoint else "https://api.mistral.ai/v1"

    def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.2) -> str:
        url = f"{self.endpoint}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                }
            ],
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            return self._parse_response(data)
        except httpx.HTTPStatusError as exc:
            print(f"[MistralClient] HTTP error {exc.response.status_code} calling {url}: {exc.response.text}")
            return ""
        except Exception as exc:
            print(f"[MistralClient] request failed: {exc}")
            return ""

    def _parse_response(self, data: Dict[str, Any]) -> str:
        if "choices" in data and isinstance(data["choices"], list) and data["choices"]:
            choice = data["choices"][0]
            if isinstance(choice, dict):
                message = choice.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str):
                        return content.strip()
                    if isinstance(content, list):
                        text_parts = []
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                text_parts.append(item["text"])
                        if text_parts:
                            return "".join(text_parts).strip()
                text = choice.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()
        if "results" in data and isinstance(data["results"], list):
            for item in data["results"]:
                if isinstance(item, dict):
                    if "generated_text" in item:
                        return item["generated_text"].strip()
                    if "output_text" in item:
                        return item["output_text"].strip()
                    if "content" in item and isinstance(item["content"], list):
                        text_parts = []
                        for content in item["content"]:
                            if isinstance(content, dict) and "text" in content:
                                text_parts.append(content["text"])
                        if text_parts:
                            return "".join(text_parts).strip()
        if "output" in data and isinstance(data["output"], str):
            return data["output"].strip()
        return str(data)
