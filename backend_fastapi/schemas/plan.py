# schemas/plan.py
from typing import Optional, Any  # <--- Esta línea es la que falta o debe estar completa
from pydantic import BaseModel
from uuid import UUID

class PlanRead(BaseModel):
    id: UUID
    nombre: str
    descripcion: Optional[str] = None
    precio_cop: int
    precio_mensual: float = 0.0
    duracion_dias: int
    tipo_suscripcion: str | None = None 
    limite_pacientes_diario: int
    caracteristicas: Optional[Any] = None 
    activo: bool
    orden: int
    # NUEVOS CAMPOS DE PERMISOS
    can_use_odontogram: bool = False
    can_use_multimedia: bool = False
    can_use_voice: bool = False
    can_export_history: bool = False

    class Config:
        from_attributes = True