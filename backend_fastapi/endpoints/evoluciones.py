from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from utils.fechas import ahora_naive
from uuid import UUID
from database import get_db
from dependencies.auth import get_current_user
from dependencies.limites import verificar_suscripcion_activa
from models import Usuario, Paciente, Evolucion
from pydantic import BaseModel

router = APIRouter()

# --- ESQUEMAS DE VALIDACIÓN ---
class EvolucionCreate(BaseModel):
    descripcion: str

class EvolucionUpdate(BaseModel):
    descripcion: str

# --- ENDPOINTS ---

# 1. Obtener evoluciones
@router.get("/pacientes/{paciente_id}")
async def get_evoluciones(
    paciente_id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query_pac = select(Paciente).where(
        Paciente.id == paciente_id,
        Paciente.is_deleted == False
    )
    if not current_user.is_admin:
        query_pac = query_pac.where(Paciente.odontologo_id == current_user.id)

    result = await db.execute(query_pac)
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    
    result = await db.execute(
        select(Evolucion)
        .where(
            Evolucion.paciente_id == paciente_id,
            Evolucion.is_deleted == False
        )
        .order_by(desc(Evolucion.fecha), desc(Evolucion.id))
    )
    evoluciones = result.scalars().all()
    
    return {
        "success": True,
        "evoluciones": [
            {
                "id": str(e.id),
                "descripcion": e.descripcion,
                "fecha": e.fecha.strftime("%Y-%m-%d %H:%M"),
                "paciente_id": str(e.paciente_id)
            }
            for e in evoluciones
        ]
    }

# 2. Crear evolución
@router.post("/pacientes/{paciente_id}")
async def create_evolucion(
    paciente_id: UUID, 
    data: EvolucionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)

    descripcion_limpia = (data.descripcion or "").strip()
    if not descripcion_limpia:
        raise HTTPException(400, "La descripción de la evolución no puede estar vacía")

    query_pac = select(Paciente).where(
        Paciente.id == paciente_id,
        Paciente.is_deleted == False
    )
    if not current_user.is_admin:
        query_pac = query_pac.where(Paciente.odontologo_id == current_user.id)

    result = await db.execute(query_pac)
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(404, "Paciente no encontrado")
    
    fecha_sin_zona = ahora_naive()
    # Si opera un administrador, se vincula al odontólogo dueño del paciente
    doctor_propietario_id = paciente.odontologo_id if current_user.is_admin else current_user.id

    nueva = Evolucion(
        descripcion=descripcion_limpia,
        fecha=fecha_sin_zona,
        paciente_id=paciente_id,
        odontologo_id=doctor_propietario_id,
        is_deleted=False
    )
    
    db.add(nueva)
    await db.commit()
    
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


@router.put("/{evolucion_id}")
async def update_evolucion(
    evolucion_id: UUID,
    data: EvolucionUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)

    if not data.descripcion or not data.descripcion.strip():
        raise HTTPException(400, "La descripción de la evolución no puede estar vacía")

    result = await db.execute(
        select(Evolucion).where(
            Evolucion.id == evolucion_id,
            Evolucion.is_deleted == False
        )
    )
    evolucion = result.scalar_one_or_none()
    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada o ya eliminada")
    
    if not current_user.is_admin and evolucion.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado")
    
    evolucion.descripcion = data.descripcion.strip()
    await db.commit()
    return {"success": True, "message": "Evolución actualizada"}

# backend_fastapi/endpoints/evoluciones.py

@router.delete("/{evolucion_id}")
async def delete_evolucion(
    evolucion_id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_suscripcion_activa(current_user, db)
    
    result = await db.execute(
        select(Evolucion).where(
            Evolucion.id == evolucion_id,
            Evolucion.is_deleted == False
        )
    )
    evolucion = result.scalar_one_or_none()

    if not evolucion:
        raise HTTPException(404, "Evolución no encontrada o ya eliminada")

    if not current_user.is_admin and evolucion.odontologo_id != current_user.id:
        raise HTTPException(403, "No autorizado para eliminar esta nota")

    evolucion.is_deleted = True
    evolucion.deleted_at = ahora_naive()
    
    await db.commit()
    return {"success": True, "message": "Evolución movida a la papelera"}