from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional, Union # Añadimos Union por seguridad
from uuid import UUID # IMPORTANTE: Para que reconozca los códigos largos

class CitaCreate(BaseModel):
    """Esquema para CREAR una nueva cita"""
    fecha: str  
    hora: str   
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    # CAMBIO: De int a str para aceptar el UUID del paciente
    paciente_id: Optional[str] = None 
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaUpdate(BaseModel):
    """Esquema para ACTUALIZAR una cita existente"""
    fecha: Optional[str] = None
    hora: Optional[str] = None
    motivo: Optional[str] = None
    doctor: Optional[str] = None
    # CAMBIO: También aquí debe aceptar el código largo
    paciente_id: Optional[str] = None 
    paciente_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None

class CitaResponse(BaseModel):
    """Esquema para RESPONDER con datos de cita"""
    # CAMBIO: El ID de la cita propia también suele ser UUID en su base de datos
    id: Union[str, int] 
    fecha: str
    hora: str
    motivo: Optional[str]
    doctor: Optional[str] # Cambiado a Optional por si acaso
    estado: str
    # CAMBIO: Para que al leer la cita no explote si el ID es largo
    paciente_id: Optional[Union[str, int]] 
    paciente_nombre: Optional[str]
    telefono: Optional[str]
    
    class Config:
        from_attributes = True