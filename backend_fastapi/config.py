# config.py
import os
from datetime import timedelta

class Config:
    SECRET_KEY = "tu-clave-secreta-muy-dificil-de-adivinar-cambiala-en-produccion"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30  # El token expira en 30 minutos