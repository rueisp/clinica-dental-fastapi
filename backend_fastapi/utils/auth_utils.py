# backend_fastapi/utils/auth_utils.py
import logging
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from config import Config
from werkzeug.security import check_password_hash as check_werkzeug

logger = logging.getLogger("auth_utils")

# 1. Blindaje Fail-Fast de configuración criptográfica
if not Config.SECRET_KEY or len(Config.SECRET_KEY) < 16:
    raise RuntimeError("SECRET_KEY no configurada o demasiado corta (mínimo 16 caracteres).")

if Config.ALGORITHM.upper() == "NONE":
    raise RuntimeError("El algoritmo 'NONE' no está permitido por seguridad criptográfica.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseñas en formato nuevo (Passlib) y viejo (Werkzeug) con observabilidad"""
    try:
        if not plain_password or not hashed_password:
            return False

        # Si empieza con $, es formato Bcrypt (Nuevos registros)
        if str(hashed_password).startswith("$"):
            return pwd_context.verify(plain_password, hashed_password)
        
        # Formato histórico de Werkzeug (Usuario admin inicial)
        return check_werkzeug(hashed_password, plain_password)
    except Exception as e:
        logger.warning(f"Error verificando contraseña: {type(e).__name__} - {e}")
        return False

def hash_password(password: str) -> str:
    """Genera hash Bcrypt seguro validando que la contraseña no esté vacía"""
    if not password or not isinstance(password, str):
        raise ValueError("La contraseña a hashear no puede estar vacía.")
    return pwd_context.hash(password)

def crear_token_acceso(data: dict) -> str:
    """Crea un token JWT firmado con expiración segura e iat en UTC"""
    to_encode = data.copy()
    ahora_utc = datetime.now(timezone.utc)
    expire = ahora_utc + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": ahora_utc
    })
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)

def decodificar_token(token: str) -> dict:
    """Decodifica y valida un token JWT exigiendo expiración explícita (exp)"""
    payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
    if "exp" not in payload:
        raise JWTError("El token no contiene tiempo de expiración (exp).")
    return payload