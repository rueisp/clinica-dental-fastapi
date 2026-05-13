# dependencies/limites.py
import pytz
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import LimiteDiario, Usuario, Plan, Subscription

COLOMBIA_TZ = pytz.timezone('America/Bogota')

async def verificar_suscripcion_activa(current_user: Usuario, db: AsyncSession):
    """Valida que la suscripción esté activa."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    
    if not sub or sub.status != "active":
        detail = "Tu pago está pendiente de aprobación." if sub and sub.status == "pending_payment" else "Tu suscripción no está activa."
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
    return sub

async def verificar_permiso(feature: str, current_user: Usuario, db: AsyncSession):

    if current_user.is_admin:
        return True
    """
    Verifica si el plan permite una función. 
    REGLA: Si es 'trial', permite TODO.
    """
    # 1. Primero ver que la suscripción esté activa
    sub = await verificar_suscripcion_activa(current_user, db)
    
    # 2. REGLA DE ORO: Si es trial, tiene permiso para todo
    if sub.plan_type.lower() == "trial":
        return True
    
    # 3. Si no es trial, buscamos los permisos específicos del plan en la tabla 'planes'
    result = await db.execute(select(Plan).where(Plan.nombre == sub.plan_type))
    plan = result.scalar_one_or_none()
    
    if not plan or not getattr(plan, feature, False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan actual no incluye esta funcionalidad. Mejora a PRO para activarla."
        )
    return True

async def verificar_limite_pacientes(current_user: Usuario, db: AsyncSession):
    sub = await verificar_suscripcion_activa(current_user, db)
    
    # ✅ FECHA LOCAL: Obtenemos la fecha actual en Colombia
    hoy = datetime.now(COLOMBIA_TZ).date()
    
    # Buscamos el plan para obtener el límite (o usamos 20 por defecto)
    result = await db.execute(select(Plan).where(Plan.nombre == sub.plan_type.lower()))
    plan_info = result.scalar_one_or_none()
    
    # ✅ LÍMITE: Si no hay plan_info, el estándar es 20
    limite_maximo = plan_info.limite_pacientes_diario if plan_info else 20
    
    # Consultamos cuántos lleva hoy
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