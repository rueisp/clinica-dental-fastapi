from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional, Union # Añadimos Union para mayor flexibilidad
from uuid import UUID

# Usamos PagoCreate para que coincida con lo que busca tu __init__.py
class PagoCreate(BaseModel):
    # CAMBIO: De int a Union[str, int] para aceptar el UUID largo
    paciente_id: Optional[Union[str, int]] = None
    paciente_nombre: str = Field(..., min_length=1)
    fecha: date 
    descripcion: str
    # CAMBIO: Usar float o Decimal es mejor para dinero, pero si prefiere int, asegúrese de que el frontend envíe números
    monto: float = Field(..., gt=0) 
    metodo_pago: str
    observacion: Optional[str] = None
    pagado_por: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = False

class PagoResponse(BaseModel):
    id: UUID  # Para que acepte el formato 58d54ab0...
    codigo: str
    paciente_id: Optional[UUID] = None
    paciente_nombre: Optional[str] = "Paciente General"
    fecha: date
    hora: Optional[time] = None
    monto: float
    metodo_pago: Optional[str] = "Efectivo"
    descripcion: Optional[str] = "Consulta"
    observacion: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = False
    created_at: Optional[datetime] = None # Campo obligatorio según el error

    class Config:
        from_attributes = True