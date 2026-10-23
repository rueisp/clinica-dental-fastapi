# backend_fastapi/dependencies/limites.py
from datetime import datetime
from typing import Literal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from models import LimiteDiario, Usuario, Plan, Subscription
from utils.fechas import hoy_local, fecha_esta_vencida

Feature = Literal[
    "can_use_odontogram", 
    "can_use_multimedia", 
    "can_use_voice", 
    "can_export_history", 
    "can_use_bot"
]

# Ubicación: backend_fastapi/dependencies/limites.py
async def verificar_suscripcion_activa(current_user: Usuario, db: AsyncSession):
    """Valida la suscripción trayendo el Plan en un solo viaje SQL (Optimizado bajo Regla 7.E)"""
    # 1. BYPASS PARA EL ADMINISTRADOR
    if current_user.is_admin:
        sub_admin = Subscription(status="active", plan_type="pro")
        sub_admin.plan_cargado = Plan(
            can_use_odontogram=True, can_use_multimedia=True,
            can_use_voice=True, can_export_history=True,
            can_use_bot=True, limite_pacientes_diario=9999
        )
        return sub_admin

    # 2. CONSULTA ÚNICA UNIFICADA: Subscription + Plan con prioridad determinista por ID
    query = (
        select(Subscription, Plan)
        .outerjoin(Plan, (Subscription.plan_id == Plan.id) | (func.lower(Subscription.plan_type) == func.lower(Plan.nombre)))
        .where(Subscription.user_id == current_user.id)
        .order_by(case((Subscription.plan_id == Plan.id, 1), else_=2))
    )
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu cuenta no tiene una suscripción registrada.")

    sub, plan = row

    # 3. Validación de estado básico
    if sub.status != "active":
        detail = "Tu pago está pendiente de aprobación." if sub.status == "pending_payment" else "Tu suscripción no está activa."
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    # 4. Validación estricta de fecha de vigencia delegada a fechas.py
    if not sub.current_period_end or fecha_esta_vencida(sub.current_period_end):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan ha expirado. Por favor, renueva tu suscripción para continuar agregando o editando información."
        )

    sub.plan_cargado = plan
    return sub

async def verificar_permiso(
    feature: Feature, 
    current_user: Usuario, 
    db: AsyncSession,
    sub: Subscription | None = None
):
    """Verifica si el plan permite una función reutilizando la suscripción en memoria si ya fue cargada"""
    if current_user.is_admin:
        return True

    # 1. Reutiliza la suscripción en memoria o la consulta si no fue provista
    if sub is None:
        sub = await verificar_suscripcion_activa(current_user, db)
    
    # 2. REGLA DE ORO: Trial tiene permiso total
    if sub.plan_type and sub.plan_type.lower() == "trial":
        return True
    
    # 3. Leemos el plan y validamos con bool() estricto contra posibles NULLs en BD
    plan = getattr(sub, "plan_cargado", None)
    
    if not plan or not bool(getattr(plan, feature, False)):
        plan_sugerido = "ULTRA" if feature == "can_use_bot" else "PRO"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tu plan actual no incluye esta funcionalidad. Mejora a {plan_sugerido} para activarla."
        )
    return True


async def verificar_limite_pacientes(
    current_user: Usuario, 
    db: AsyncSession,
    sub: Subscription | None = None
):
    """Verifica el límite de creación diaria de pacientes reutilizando la suscripción en memoria"""
    # 1. BYPASS PARA EL ADMINISTRADOR
    if current_user.is_admin:
        return True

    # 2. Reutiliza la suscripción en memoria o la consulta si no fue provista (Cero SELECTs duplicados)
    if sub is None:
        sub = await verificar_suscripcion_activa(current_user, db)
    
    # 3. Fecha local centralizada
    hoy = hoy_local()
    
    # 4. Leemos el límite directamente del plan en memoria (fallback oficial de 10)
    plan_info = getattr(sub, "plan_cargado", None)
    if plan_info and getattr(plan_info, "limite_pacientes_diario", None):
        limite_maximo = plan_info.limite_pacientes_diario
    else:
        limite_maximo = 10
    
    # 5. Consultamos únicamente cuántos pacientes lleva registrados hoy
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
            detail=f"Límite diario alcanzado ({cantidad_actual}/{limite_maximo}). Vuelve mañana para registrar más pacientes."
        )
    return True