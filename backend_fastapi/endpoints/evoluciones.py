from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
import pytz
from database import get_db
from dependencies.auth import get_current_user
from models import Usuario, Paciente, Evolucion
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class EvolucionCreate(BaseModel):
    descripcion: str

class EvolucionUpdate(BaseModel):
    descripcion: str

class EvolucionResponse(BaseModel):
    id: int
    descripcion: str
    fecha: str
    paciente_id: int

# Obtener evoluciones de un paciente
@router.get("/pacientes/{paciente_id}/evoluciones")
async def get_evoluciones(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verificar que el paciente existe y pertenece al usuario
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == False
        )
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    # Obtener evoluciones
    result = await db.execute(
        select(Evolucion)
        .where(Evolucion.paciente_id == paciente_id)
        .order_by(desc(Evolucion.fecha))
    )
    evoluciones = result.scalars().all()
    
    return {
        "success": True,
        "evoluciones": [
            {
                "id": e.id,
                "descripcion": e.descripcion,
                "fecha": e.fecha.strftime("%Y-%m-%d %H:%M"),
                "paciente_id": e.paciente_id
            }
            for e in evoluciones
        ]
    }

# Crear evolución
@router.post("/pacientes/{paciente_id}/evoluciones")
async def create_evolucion(
    paciente_id: int,
    data: EvolucionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verificar paciente
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == False
        )
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    # Crear evolución
    colombia_tz = pytz.timezone('America/Bogota')
    fecha_local = datetime.now(colombia_tz)
    fecha_sin_zona = fecha_local.replace(tzinfo=None)  # ← Eliminar zona horaria

    nueva = Evolucion(
        descripcion=data.descripcion,
        fecha=fecha_sin_zona,
        paciente_id=paciente_id
    )
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    
    return {
        "success": True,
        "message": "Evolución agregada",
        "evolucion": {
            "id": nueva.id,
            "descripcion": nueva.descripcion,
            "fecha": nueva.fecha.strftime("%Y-%m-%d %H:%M"),
            "paciente_id": nueva.paciente_id
        }
    }

# Editar evolución
@router.put("/evoluciones/{evolucion_id}")
async def update_evolucion(
    evolucion_id: int,
    data: EvolucionUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Evolucion).where(Evolucion.id == evolucion_id)
    )
    evolucion = result.scalar_one_or_none()
    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada")
    
    # Verificar permiso a través del paciente
    result = await db.execute(
        select(Paciente).where(Paciente.id == evolucion.paciente_id)
    )
    paciente = result.scalar_one_or_none()
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    evolucion.descripcion = data.descripcion
    await db.commit()
    
    return {"success": True, "message": "Evolución actualizada"}

# Eliminar evolución
@router.delete("/evoluciones/{evolucion_id}")
async def delete_evolucion(
    evolucion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Evolucion).where(Evolucion.id == evolucion_id)
    )
    evolucion = result.scalar_one_or_none()
    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada")
    
    # Verificar permiso
    result = await db.execute(
        select(Paciente).where(Paciente.id == evolucion.paciente_id)
    )
    paciente = result.scalar_one_or_none()
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    await db.delete(evolucion)
    await db.commit()
    
    return {"success": True, "message": "Evolución eliminada"}