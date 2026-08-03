from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "IONTIX Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres.bqfbxyigvhfxwojfwzfg:iP8jHwcnnBTQhGFd@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
    
    # Supabase
    SUPABASE_URL: str = "https://bqfbxyigvhfxwojfwzfg.supabase.co"
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Security
    JWT_SECRET: str = "taNRQZ-ydj_0S30WNfz0u-MXlkIH7BVyj7lo4kY2pu4"
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

def get_settings() -> Settings:
    return Settings()
