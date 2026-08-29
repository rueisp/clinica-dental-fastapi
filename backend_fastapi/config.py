# backend_fastapi/config.py
import os
from datetime import timedelta
import cloudinary

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-de-desarrollo")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 120
    
    # Evolution API v2
    EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "").rstrip("/")
    EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

    # Gemini IA
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # Telegram
    TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
    CHAT_ID = os.getenv("CHAT_ID", "")

def init_cloudinary():
    """Inicializa la configuración global de Cloudinary"""
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )