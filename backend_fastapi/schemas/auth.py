from pydantic import BaseModel, EmailStr
from typing import Optional

class UserPermissions(BaseModel):
    can_use_odontogram: bool
    can_use_multimedia: bool
    can_use_voice: bool
    can_export_history: bool 

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    nombre_usuario: str
    permissions: UserPermissions
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

class UserPermissions(BaseModel):
    can_use_odontogram: bool
    can_use_multimedia: bool
    can_use_voice: bool
    can_export_history: bool    