from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Application configuration from environment variables"""
    # Database
    database_url: str = "postgresql+asyncpg://user:password@host:5432/barbershop"
    
    # Auth
    secret_key: str = "your-secret-key-change-in-production"
    
    # Expo Push Notifications
    expo_access_token: str = ""
    
    # Web Push (VAPID)
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_mailto: str = "mailto:admin@barbershop.com"
    
    # Evolution API
    evolution_api_url: str = ""
    evolution_api_key: str = ""
    
    # App settings
    app_name: str = "Barbershop Manager"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
