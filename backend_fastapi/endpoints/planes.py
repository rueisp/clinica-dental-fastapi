from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession # Cambiamos a AsyncSession
from sqlalchemy import select # Importamos select
from typing import List
from database import get_db
from models import Plan
from schemas.plan import PlanRead

router = APIRouter()

@router.get("/", response_model=List[PlanRead])
async def listar_planes(db: AsyncSession = Depends(get_db)): # Añadimos 'async' y cambiamos el tipo de db
    try:
        # En modo Async se usa esta estructura:
        query = select(Plan).where(Plan.activo == True).order_by(Plan.orden.asc())
        result = await db.execute(query) # Ejecutamos la consulta de forma asíncrona
        planes = result.scalars().all() # Obtenemos los resultados
        
        return planes
    except Exception as e:
        print(f"Error en base de datos: {e}")
        raise HTTPException(status_code=500, detail=str(e))