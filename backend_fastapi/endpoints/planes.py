# backend_fastapi/endpoints/planes.py
import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Plan
from schemas.plan import PlanRead

logger = logging.getLogger("planes")

router = APIRouter()

@router.get("/", response_model=List[PlanRead])
async def listar_planes(db: AsyncSession = Depends(get_db)):
    """Lista todos los planes activos en el catálogo (Público para Landing)"""
    try:
        query = select(Plan).where(Plan.activo.is_(True)).order_by(Plan.orden.asc())
        result = await db.execute(query)
        return result.scalars().all()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error consultando catálogo de planes")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al consultar los planes disponibles"
        )

@router.get("/{plan_id}", response_model=PlanRead)
async def obtener_plan(plan_id: UUID, db: AsyncSession = Depends(get_db)):
    """Consulta los detalles de un plan activo por su UUID"""
    try:
        query = select(Plan).where(Plan.id == plan_id, Plan.activo.is_(True))
        result = await db.execute(query)
        plan = result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado o inactivo")
        return plan
    except HTTPException:
        raise
    except Exception:
        logger.exception(f"Error consultando plan {plan_id}")
        raise HTTPException(status_code=500, detail="Error interno al consultar el plan")