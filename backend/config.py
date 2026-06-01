from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:root@localhost:5432/agent_workflow_db"
    aws_region: str = "us-east-1"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
