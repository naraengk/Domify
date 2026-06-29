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
    # comma-separated allowed origins, e.g. http://localhost:5173,https://domifyapp.onrender.com
    cors_origins: str = "http://localhost:5173,http://localhost:8000,https://domifyapp.onrender.com"
    cookie_secure: bool = False  # set True in production (HTTPS)
    cookie_domain: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
