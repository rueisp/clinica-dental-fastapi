# utils/auth_utils.py
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from config import Config

# Configuración de hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña plain coincide con el hash"""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Genera hash de una contraseña"""
    return pwd_context.hash(password)

def crear_token_acceso(data: dict) -> str:
    """Crea un token JWT"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)
    return encoded_jwt

def decodificar_token(token: str) -> dict:
    """Decodifica un token JWT"""
    return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])