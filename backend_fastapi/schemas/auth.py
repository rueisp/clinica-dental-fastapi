# backend_fastapi/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Union
from uuid import UUID 

class UserPermissions(BaseModel):
    """Define los permisos según el plan del usuario (valores por defecto seguros)"""
    can_use_odontogram: bool = False
    can_use_multimedia: bool = False
    can_use_voice: bool = False
    can_export_history: bool = False
    can_use_bot: bool = False
 
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=128)

class TokenResponse(BaseModel):
    """Respuesta tras un login o registro exitoso"""
    access_token: str
    token_type: str
    nombre_usuario: str
    nombres: str
    apellidos: Optional[str] = None
    email: str
    is_admin: bool
    permissions: UserPermissions

class UsuarioCreate(BaseModel):
    """Datos necesarios para registrar un nuevo odontólogo"""
    username: str = Field(..., min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    nombres: str = Field(..., min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, max_length=100)
    nombre_consultorio: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)
    plan_id: Optional[Union[UUID, str]] = None

class PerfilUpdate(BaseModel):
    """Datos permitidos para actualizar el perfil de marca"""
    nombres: str = Field(..., min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, max_length=100)
    nombre_consultorio: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=50)

class PasswordUpdate(BaseModel):
    """Esquema para el cambio de contraseña"""
    old_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)