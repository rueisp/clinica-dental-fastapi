# backend_fastapi/schemas/cita.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Union
from uuid import UUID

class CitaCreate(BaseModel):
    """Esquema para crear una nueva cita médica"""
    fecha: str  
    hora: str   
    motivo: Optional[str] = Field("Consulta", max_length=255)
    doctor: Optional[str] = Field(None, max_length=100)
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: Optional[str] = Field(None, max_length=255)
    paciente_telefono: Optional[str] = Field(None, max_length=50)

class CitaUpdate(BaseModel):
    """Esquema para actualizar una cita existente"""
    fecha: Optional[str] = None
    hora: Optional[str] = None
    motivo: Optional[str] = Field(None, max_length=255)
    doctor: Optional[str] = Field(None, max_length=100)
    paciente_id: Optional[Union[UUID, str]] = None 
    paciente_nombre: Optional[str] = Field(None, max_length=255)
    paciente_telefono: Optional[str] = Field(None, max_length=50)

class CitaResponse(BaseModel):
    """Esquema para serializar y responder datos de cita"""
    model_config = ConfigDict(from_attributes=True)

    id: Union[UUID, str]
    fecha: str
    hora: str
    motivo: Optional[str] = Field(None, max_length=255)
    doctor: Optional[str] = Field(None, max_length=100)
    estado: str = "pendiente"
    paciente_id: Optional[Union[UUID, str]] = None 
    paciente_nombre: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)