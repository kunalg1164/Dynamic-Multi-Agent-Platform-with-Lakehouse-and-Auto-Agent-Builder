from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    database_url: str = Field("sqlite:///./test_finance_agents.db", env="DATABASE_URL")
    minio_endpoint: str = Field("http://minio:9000", env="MINIO_ENDPOINT")
    minio_access_key: str = Field("minioadmin", env="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field("minioadmin", env="MINIO_SECRET_KEY")
    mistral_api_key: str = Field(..., env="MISTRAL_API_KEY")
    mistral_model: str = Field("codestral-2508", env="MISTRAL_MODEL")
    mistral_endpoint: str = Field("https://api.mistral.ai/v1", env="MISTRAL_ENDPOINT")

    class Config:
        env_file = [str(BASE_DIR / ".env"), str(PROJECT_ROOT / ".env")]
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
