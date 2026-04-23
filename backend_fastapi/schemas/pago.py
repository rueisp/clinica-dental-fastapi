# schemas/pago.py
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional

class PagoCreate(BaseModel):
    paciente_id: Optional[int] = None
    paciente_nombre: str
    fecha: str  # Formato DD/MM/YYYY
    descripcion: str
    monto: int = Field(..., gt=0)
    metodo_pago: str
    observacion: Optional[str] = None
    pagado_por: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = True

class PagoResponse(BaseModel):
    id: int
    codigo: str
    paciente_nombre: str
    fecha: date
    hora: time
    monto: int
    metodo_pago: str
    descripcion: str
    observacion: Optional[str]
    telefono: Optional[str]
    
    class Config:
        from_attributes = True