from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "NeXooAi Virtual Saree Try-On"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:4200", "http://127.0.0.1:4200"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalise_debug_value(cls, v: Union[str, bool, int]) -> Union[str, bool, int]:
        """Accept common deployment labels while preserving strict boolean parsing otherwise."""
        if isinstance(v, str):
            normalised = v.strip().lower()
            if normalised in {"release", "production", "prod"}:
                return False
            if normalised in {"development", "dev", "debug"}:
                return True
        return v

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexooai_dev.sqlite3"

    # Storage
    STORAGE_PROVIDER: str = "local"
    STORAGE_LOCAL_DIR: str = "./media"
    PUBLIC_BASE_URL: str = "http://127.0.0.1:8000"

    # AI Try-On Provider
    AI_TRYON_PROVIDER: str = "huggingface"  # "huggingface" | "gemini" | "fal-fashn" | "fal-kolors" | "fashn" | "replicate" | "mock"
    FAL_KEY: str = ""
    HF_TOKEN: str = ""
    GEMINI_API_KEY: str = ""
    AI_TRYON_API_KEY: str = ""
    AI_TRYON_API_URL: str = ""
    AI_TRYON_TIMEOUT_SECONDS: int = 60
    AI_TRYON_MAX_RETRIES: int = 2

    # Privacy & Tokens
    SECRET_KEY: str = "dev-insecure-secret-key-change-in-production"
    DOWNLOAD_TOKEN_EXPIRY_MINUTES: int = 30
    MEDIA_RETENTION_HOURS: int = 24

    # Kiosk Security
    KIOSK_DEFAULT_LANGUAGE: str = "ta"
    KIOSK_INACTIVITY_TIMEOUT_SECONDS: int = 90
    KIOSK_ADMIN_PIN: str = "849201"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
