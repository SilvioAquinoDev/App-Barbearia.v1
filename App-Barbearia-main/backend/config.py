from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional, List

class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    # ============================================
    # DATABASE
    # ============================================
    database_url: str = "postgresql+asyncpg://user:password@host:5432/barbershop"
    
    # ============================================
    # AUTH
    # ============================================
    secret_key: str = "your-secret-key-change-in-production"
    
    # ============================================
    # APP SETTINGS
    # ============================================
    debug: bool = True
    app_name: str = "Barbershop Manager"
    
    # ============================================
    # SUPABASE STORAGE
    # ============================================
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    
    # ============================================
    # CRON (Vercel)
    # ============================================
    cron_secret: Optional[str] = None
    
    # ============================================
    # CORS
    # ============================================
    cors_origins: str = "http://localhost:5173"
    
    # ============================================
    # NOTIFICATIONS (Expo + Web Push)
    # ============================================
    expo_access_token: str = ""
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_mailto: str = "mailto:admin@example.com"
    
    # ============================================
    # WHATSAPP - Evolution API
    # ============================================
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    
    # ============================================
    # Google Auth
    # ============================================
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # ============================================
    # MERCADOPAGO
    # ============================================
    mercadopago_token: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignora qualquer variável extra não declarada

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()







"""from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    ""Application configuration from environment variables""
    # Database
    database_url: str = "postgresql+asyncpg://user:password@host:5432/barbershop"
    
    # Auth
    secret_key: str = "your-secret-key-change-in-production"
    google_client_id: str = ""
    google_client_secret: str = ""
    
    # Expo Push Notifications
    expo_access_token: str = ""
    
    # Web Push (VAPID)
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_mailto: str = "mailto:admin@barbershop.com"
    
    # Evolution API
    evolution_api_url: str = ""
    evolution_api_key: str = ""
    
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    
    # Mercado Pago
    mercadopago_token: str = ""
    mercadopago_webhook_secret: str = ""
    
    # App settings
    app_name: str = "Barbershop Manager"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    ""Get cached settings instance""
    return Settings()"""
