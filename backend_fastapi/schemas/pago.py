from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional

# Usamos PagoCreate para que coincida con lo que busca tu __init__.py
class PagoCreate(BaseModel):
    paciente_id: Optional[int] = None
    paciente_nombre: str = Field(..., min_length=1)
    fecha: date 
    descripcion: str
    monto: int = Field(..., gt=0) # Pesos colombianos
    metodo_pago: str
    observacion: Optional[str] = None
    pagado_por: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = False

class PagoResponse(BaseModel):
    id: int
    codigo: str
    paciente_id: Optional[int]
    paciente_nombre: str
    fecha: date
    hora: time
    monto: int
    metodo_pago: str
    descripcion: str
    observacion: Optional[str]
    pagado_por: Optional[str]
    telefono: Optional[str]
    es_rapido: bool
    created_at: datetime
    
    class Config:
        from_attributes = True # Esto permite que Pydantic lea tu modelo PagoClinico