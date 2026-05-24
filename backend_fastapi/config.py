# config.py
import os
from datetime import timedelta
import cloudinary

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 120

def init_cloudinary():
    """Inicializa la configuración global de Cloudinary"""
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )