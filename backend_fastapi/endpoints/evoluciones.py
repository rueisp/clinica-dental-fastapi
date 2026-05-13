from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
import pytz
from uuid import UUID  # <--- IMPORTANTE
from database import get_db
from dependencies.auth import get_current_user
from dependencies.limites import verificar_suscripcion_activa
from models import Usuario, Paciente, Evolucion
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

# --- ESQUEMAS DE VALIDACIÓN ---
class EvolucionCreate(BaseModel):
    descripcion: str

class EvolucionUpdate(BaseModel):
    descripcion: str

# --- ENDPOINTS ---

# 1. Obtener evoluciones (Cambiado int a UUID)
@router.get("/pacientes/{paciente_id}")
async def get_evoluciones(
    paciente_id: UUID, # <--- CORREGIDO
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
                "id": str(e.id), # Convertir a str para el frontend
                "descripcion": e.descripcion,
                "fecha": e.fecha.strftime("%Y-%m-%d %H:%M"),
                "paciente_id": str(e.paciente_id)
            }
            for e in evoluciones
        ]
    }

# 2. Crear evolución (Añadido odontologo_id)
@router.post("/pacientes/{paciente_id}")
async def create_evolucion(
    paciente_id: UUID, 
    data: EvolucionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)

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
    
    colombia_tz = pytz.timezone('America/Bogota')
    fecha_local = datetime.now(colombia_tz)
    fecha_sin_zona = fecha_local.replace(tzinfo=None)

    nueva = Evolucion(
        descripcion=data.descripcion,
        fecha=fecha_sin_zona,
        paciente_id=paciente_id,
        odontologo_id=current_user.id, # <--- VINCULACIÓN CON EL DOCTOR
        is_deleted=False
    )
    
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    
    return {
        "success": True,
        "message": "Evolución agregada",
        "evolucion": {
            "id": str(nueva.id),
            "descripcion": nueva.descripcion,
            "fecha": nueva.fecha.strftime("%Y-%m-%d %H:%M"),
            "paciente_id": str(nueva.paciente_id)
        }
    }

# 3. Editar y Eliminar (Cambiado int a UUID en IDs)
@router.put("/{evolucion_id}")
async def update_evolucion(
    evolucion_id: UUID, # <--- CORREGIDO
    data: EvolucionUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)

    result = await db.execute(select(Evolucion).where(Evolucion.id == evolucion_id))
    evolucion = result.scalar_one_or_none()
    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada")
    
    if not current_user.is_admin and evolucion.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    evolucion.descripcion = data.descripcion
    await db.commit()
    return {"success": True, "message": "Evolución actualizada"}

# backend_fastapi/endpoints/evoluciones.py

@router.delete("/{evolucion_id}")
async def delete_evolucion(
    evolucion_id: UUID, # IMPORTANTE: Cambie int por UUID
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)
    
    # 1. Buscar la evolución
    result = await db.execute(
        select(Evolucion).where(Evolucion.id == evolucion_id)
    )
    evolucion = result.scalar_one_or_none()

    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada")

    # 2. Verificar que usted es el dueño (Seguridad)
    if not current_user.is_admin and evolucion.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado para eliminar esta nota")

    # 3. Aplicar Borrado Suave (Soft Delete)
    evolucion.is_deleted = True
    evolucion.deleted_at = datetime.now() # O su lógica de Bogotá
    
    await db.commit()
    return {"success": True, "message": "Evolución movida a la papelera"}