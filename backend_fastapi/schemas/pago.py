# backend_fastapi/schemas/pago.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, time, datetime
from typing import Optional, Union
from uuid import UUID

class PagoCreate(BaseModel):
    """Esquema para el registro de un cobro o recibo clínico"""
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: str = Field(..., min_length=1, max_length=255)
    fecha: Optional[Union[date, str]] = None
    concepto: str = Field(..., min_length=1, max_length=255)
    monto: float = Field(..., gt=0, le=100_000_000) 
    metodo_pago: str = Field("Efectivo", max_length=50)
    observacion: Optional[str] = Field(None, max_length=1000)
    pagado_por: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=30)
    es_rapido: bool = False

class PagoResponse(BaseModel):
    """Esquema para serializar y responder datos de cobro"""
    model_config = ConfigDict(from_attributes=True)

    id: Union[UUID, str]
    codigo: str
    paciente_id: Optional[Union[UUID, str]] = None
    paciente_nombre: Optional[str] = Field("Paciente General", max_length=255)
    fecha: Union[date, str]
    hora: Optional[time] = None
    monto: float
    metodo_pago: Optional[str] = Field("Efectivo", max_length=50)
    concepto: Optional[str] = Field("Consulta", max_length=255)
    observacion: Optional[str] = Field(None, max_length=1000)
    telefono: Optional[str] = Field(None, max_length=30)
    es_rapido: bool = False
    created_at: Optional[datetime] = None

class PagoReporte(BaseModel):
    """Esquema para reportar el pago de una suscripción profesional"""
    plan_id: Union[UUID, str]
    plan_nombre: str = Field(..., min_length=1, max_length=50)
    monto: float = Field(..., gt=0, le=100_000_000)
    comprobante_url: str = Field(..., min_length=5, max_length=500)
    referencia_pago: str = Field(..., min_length=1, max_length=50)