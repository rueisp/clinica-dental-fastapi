# schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    nombre_usuario: str
    is_admin: bool

class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    nombre_completo: Optional[str] = None