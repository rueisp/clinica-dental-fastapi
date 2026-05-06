from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    nombre_usuario: str
    nombres: str              # Añada esto
    apellidos: Optional[str] = None  # Añada esto
    is_admin: bool

class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    nombres: str            # Ya lo tiene corregido aquí
    apellidos: Optional[str] = None  # Agregue esta línea para los apellidos
    nombre_consultorio: Optional[str] = None
    telefono: Optional[str] = None
    plan_id: int