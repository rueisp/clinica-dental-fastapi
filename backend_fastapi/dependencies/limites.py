# dependencies/limites.py
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from typing import Annotated
from database import get_db
from models_fastapi import Usuario, LimiteDiario, UsuarioPlan, Plan

async def verificar_limite_pacientes(
    current_user: Usuario,
    db: AsyncSession
):
    """Verifica límite diario de pacientes"""
    
    fecha_hoy = date.today()
    
    # Obtener el plan activo del usuario
    result = await db.execute(
        select(UsuarioPlan).where(
            UsuarioPlan.usuario_id == current_user.id,
            UsuarioPlan.estado == 'activo'
        )
    )
    usuario_plan = result.scalar_one_or_none()
    
    if usuario_plan:
        result_plan = await db.execute(select(Plan).where(Plan.id == usuario_plan.plan_id))
        plan = result_plan.scalar_one_or_none()
        limite_segun_plan = plan.limite_pacientes_diario if plan else 10
    else:
        limite_segun_plan = 10
    
    # Buscar o crear límite diario
    result = await db.execute(
        select(LimiteDiario).where(
            LimiteDiario.usuario_id == current_user.id,
            LimiteDiario.fecha == fecha_hoy
        )
    )
    limite_diario = result.scalar_one_or_none()
    
    if limite_diario is None:
        limite_diario = LimiteDiario(
            usuario_id=current_user.id,
            fecha=fecha_hoy,
            contador_pacientes=0,
            limite_actual=limite_segun_plan
        )
        db.add(limite_diario)
        await db.commit()
    else:
        if limite_diario.limite_actual != limite_segun_plan:
            limite_diario.limite_actual = limite_segun_plan
            await db.commit()
    
    if limite_diario.contador_pacientes >= limite_diario.limite_actual:
        raise HTTPException(
            status_code=429,
            detail=f"Límite diario alcanzado: {limite_diario.contador_pacientes}/{limite_diario.limite_actual} pacientes hoy."
        )
    
    return current_user