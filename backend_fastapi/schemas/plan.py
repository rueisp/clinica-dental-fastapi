# backend_fastapi/schemas/plan.py
from typing import Optional, Any, Union
from pydantic import BaseModel
from uuid import UUID

class PlanRead(BaseModel):
    """Esquema para la lectura pública y administrativa de planes"""
    id: Union[UUID, str]
    nombre: str
    descripcion: Optional[str] = None
    precio_cop: int
    precio_mensual: float = 0.0
    duracion_dias: int
    tipo_suscripcion: Optional[str] = None 
    limite_pacientes_diario: int
    caracteristicas: Optional[Any] = None 
    activo: bool = True
    orden: int = 1
    can_use_odontogram: bool = False
    can_use_multimedia: bool = False
    can_use_voice: bool = False
    can_export_history: bool = False
    can_use_bot: bool = False

    class Config:
        from_attributes = True