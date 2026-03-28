from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ScrapeFlow"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/scrapeflow"
    redis_url: str = "redis://localhost:6379/0"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.2
    browser_engine_default: str = "playwright"
    playwright_headless: bool = True
    lightpanda_cdp_url: str = "http://localhost:9222"
    lightpanda_fallback_to_playwright: bool = True
    frontend_origin: str = "http://localhost:3000"
    generated_sites_dir: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parents[2] / "storage" / "generated-sites"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.generated_sites_dir.mkdir(parents=True, exist_ok=True)
    return settings
