# backend_fastapi/config.py
import os
import cloudinary

class Config:
    # 1. Seguridad y Autenticación
    SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-de-desarrollo").strip()
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 120
    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    
    # 2. Motor de WhatsApp (Evolution API v2 en Hetzner)
    EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "").strip().rstrip("/")
    EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "").strip()

    # 3. Base de Datos Supabase (Postgres & Realtime)
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    SUPABASE_KEY = (os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")).strip()

    # 4. Inteligencia Artificial (Google Gemini)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

    # 5. Notificaciones de Administración (Telegram)
    TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "").strip()
    CHAT_ID = os.getenv("CHAT_ID", "").strip()

def init_cloudinary():
    """Inicializa la configuración global de Cloudinary forzando URLs seguras HTTPS"""
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "").strip(),
        api_key=os.getenv("CLOUDINARY_API_KEY", "").strip(),
        api_secret=os.getenv("CLOUDINARY_API_SECRET", "").strip(),
        secure=True
    )