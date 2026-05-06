from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from models import LimiteDiario, Usuario, Subscription

async def verificar_limite_pacientes(current_user: Usuario, db: AsyncSession):
    hoy = datetime.now().date()
    
    # 1. Cargamos al usuario con su suscripción de forma explícita para evitar el error de greenlet
    result_user = await db.execute(
        select(Usuario)
        .options(selectinload(Usuario.subscription))
        .where(Usuario.id == current_user.id)
    )
    user_con_plan = result_user.scalars().first()
    
    # 2. Determinar el plan y su límite
    plan = "trial"
    if user_con_plan and user_con_plan.subscription:
        plan = user_con_plan.subscription.plan_type
        
    LIMITES_POR_PLAN = {
        "trial": 5,
        "basico_mensual": 20,
        "pro_mensual": 999,
        "basico_anual": 20,
        "pro_anual": 999
    }
    
    limite_maximo = LIMITES_POR_PLAN.get(plan, 5)
    
    # 3. Buscar el conteo de hoy
    result_limite = await db.execute(
        select(LimiteDiario).where(
            LimiteDiario.user_id == current_user.id,
            LimiteDiario.fecha == hoy
        )
    )
    registro = result_limite.scalars().first()
    
    cantidad_actual = registro.contador_pacientes if registro else 0
    
    if cantidad_actual >= limite_maximo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Límite alcanzado: {cantidad_actual}/{limite_maximo} para el plan {plan}."
        )
    
    return True