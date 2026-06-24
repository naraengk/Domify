from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # default to local sqlite so the app runs without any setup
    database_url: str = "sqlite:///./domify.db"
    # no default on purpose. set JWT_SECRET in .env or as an env var
    # before starting the server. otherwise startup fails fast.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
