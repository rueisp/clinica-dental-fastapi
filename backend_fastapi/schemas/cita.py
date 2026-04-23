from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional

class CitaCreate(BaseModel):
    """Esquema para CREAR una nueva cita"""
    fecha: str  # Formato YYYY-MM-DD (como manejas en tu código)
    hora: str   # Formato HH:MM
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    paciente_id: Optional[int] = None
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaUpdate(BaseModel):
    """Esquema para ACTUALIZAR una cita existente"""
    fecha: Optional[str] = None
    hora: Optional[str] = None
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    paciente_id: Optional[int] = None
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaResponse(BaseModel):
    """Esquema para RESPONDER con datos de cita"""
    id: int
    fecha: str
    hora: str
    motivo: Optional[str]
    doctor: str
    estado: str
    paciente_id: Optional[int]
    paciente_nombre: Optional[str]
    telefono: Optional[str]
    
    class Config:
        from_attributes = True