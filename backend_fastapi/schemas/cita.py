# backend_fastapi/schemas/cita.py
from pydantic import BaseModel
from typing import Optional, Union
from uuid import UUID

class CitaCreate(BaseModel):
    """Esquema para crear una nueva cita médica"""
    fecha: str  
    hora: str   
    motivo: Optional[str] = "Consulta"
    doctor: Optional[str] = None
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaUpdate(BaseModel):
    """Esquema para actualizar una cita existente"""
    fecha: Optional[str] = None
    hora: Optional[str] = None
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    paciente_id: Optional[Union[UUID, str]] = None 
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaResponse(BaseModel):
    """Esquema para serializar y responder datos de cita"""
    id: Union[UUID, str]
    fecha: str
    hora: str
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    estado: str = "pendiente"
    paciente_id: Optional[Union[UUID, str]] = None 
    paciente_nombre: Optional[str] = None
    telefono: Optional[str] = None
    
    class Config:
        from_attributes = True