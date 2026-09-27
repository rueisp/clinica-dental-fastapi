# utils/auth_utils.py
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from config import Config
from werkzeug.security import check_password_hash as check_werkzeug

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseñas en formato nuevo (Passlib) y viejo (Werkzeug) de forma segura"""
    try:
        if not plain_password or not hashed_password:
            return False

        # 1. Si empieza con $, es formato Bcrypt (Nuevos registros)
        if str(hashed_password).startswith("$"):
            return pwd_context.verify(plain_password, hashed_password)
        
        # 2. Si no, es el formato de Werkzeug (Usuario admin histórico)
        return check_werkzeug(hashed_password, plain_password)
    except Exception:
        return False

def hash_password(password: str) -> str:
    """Genera hash Bcrypt seguro de una contraseña"""
    return pwd_context.hash(password)

def crear_token_acceso(data: dict) -> str:
    """Crea un token JWT firmado con expiración segura en UTC"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)
    return encoded_jwt

def decodificar_token(token: str) -> dict:
    """Decodifica y valida un token JWT contra el algoritmo oficial"""
    return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])