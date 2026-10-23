# backend_fastapi/config.py
import os
from dotenv import load_dotenv
import cloudinary

# Cargar variables de entorno (en Cloud Run lee directo del entorno del contenedor)
load_dotenv()

class Config:
    # 1. Seguridad y Autenticación
    SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
    ALGORITHM = os.getenv("ALGORITHM", "HS256").strip().upper()
    try:
        ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    except (ValueError, TypeError):
        ACCESS_TOKEN_EXPIRE_MINUTES = 120

    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    
    # 2. Motor de WhatsApp (Evolution API v2 en Hetzner)
    EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "").strip().rstrip("/")
    EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "").strip()
    WEBHOOK_URL = os.getenv(
        "WEBHOOK_URL", 
        "https://dental-backend-779789369655.us-east1.run.app/api/whatsapp/webhook/evolution"
    ).strip()
    try:
        VENTANA_SILENCIO_HORAS = int(os.getenv("VENTANA_SILENCIO_HORAS", "0"))
    except (ValueError, TypeError):
        VENTANA_SILENCIO_HORAS = 0

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