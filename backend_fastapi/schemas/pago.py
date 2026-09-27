# backend_fastapi/schemas/pago.py
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional, Union
from uuid import UUID

class PagoCreate(BaseModel):
    """Esquema para el registro de un cobro o recibo clínico"""
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: str = Field(..., min_length=1)
    fecha: Optional[Union[date, str]] = None
    concepto: str
    monto: float = Field(..., gt=0) 
    metodo_pago: str = "Efectivo"
    observacion: Optional[str] = None
    pagado_por: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = False

class PagoResponse(BaseModel):
    """Esquema para serializar y responder información de cobro"""
    id: Union[UUID, str]
    codigo: str
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: Optional[str] = "Paciente General"
    fecha: Union[date, str]
    hora: Optional[time] = None
    monto: float
    metodo_pago: Optional[str] = "Efectivo"
    concepto: Optional[str] = "Consulta"
    observacion: Optional[str] = None
    telefono: Optional[str] = None
    es_rapido: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PagoReporte(BaseModel):
    """Esquema para reportar el pago de una suscripción profesional"""
    plan_id: Union[UUID, str]
    plan_nombre: str
    monto: float = Field(..., gt=0)
    comprobante_url: str
    referencia_pago: str