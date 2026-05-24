from pydantic import BaseModel, EmailStr
from typing import Optional, Union
from uuid import UUID 

class UserPermissions(BaseModel):
    """Define los permisos según el plan del usuario"""
    can_use_odontogram: bool
    can_use_multimedia: bool
    can_use_voice: bool
    can_export_history: bool 

class LoginRequest(BaseModel):
    username: str
    password: str

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
    username: str
    email: EmailStr
    password: str
    nombres: str
    apellidos: Optional[str] = None
    nombre_consultorio: Optional[str] = None
    telefono: Optional[str] = None
    plan_id: Optional[Union[UUID, str]] = None

class PerfilUpdate(BaseModel):
    """Datos permitidos para actualizar el perfil de marca"""
    nombres: str
    apellidos: str
    nombre_consultorio: Optional[str] = None
    telefono: Optional[str] = None

class PasswordUpdate(BaseModel):
    """Esquema para el cambio de contraseña"""
    old_password: str
    new_password: str