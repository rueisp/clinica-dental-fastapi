from pydantic import BaseModel
from typing import Optional, Any

class PlanRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    precio_cop: int
    precio_mensual: float = 0.0  # Cambiado para coincidir con el error anterior
    duracion_dias: int
    # AQUÍ ESTÁ EL FIX: Agregar Optional y el valor por defecto None
    tipo_suscripcion: Optional[str] = None 
    limite_pacientes_diario: int
    caracteristicas: Optional[Any] = None 
    activo: bool
    orden: int

    class Config:
        from_attributes = True