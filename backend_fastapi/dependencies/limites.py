# dependencies/limites.py
import pytz
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import LimiteDiario, Usuario, Plan, Subscription

COLOMBIA_TZ = pytz.timezone('America/Bogota')

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

    # 2. CONSULTA ÚNICA UNIFICADA: Subscription + Plan en una sola llamada SQL
    query = (
        select(Subscription, Plan)
        .outerjoin(Plan, (Subscription.plan_id == Plan.id) | (func.lower(Subscription.plan_type) == func.lower(Plan.nombre)))
        .where(Subscription.user_id == current_user.id)
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

    # 4. Validación estricta de fecha de vigencia (Blindaje contra nulos y expirados)
    if not sub.current_period_end:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan ha expirado o no tiene fecha de vigencia válida. Renueva tu suscripción para continuar."
        )

    ahora = datetime.now(COLOMBIA_TZ)
    db_fecha_fin = sub.current_period_end
    
    # Normalización segura con zona horaria de Colombia
    if hasattr(db_fecha_fin, "tzinfo") and db_fecha_fin.tzinfo is not None:
        fecha_fin = db_fecha_fin.astimezone(COLOMBIA_TZ)
    else:
        fecha_fin = COLOMBIA_TZ.localize(db_fecha_fin)

    if fecha_fin <= ahora:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu plan ha expirado. Por favor, renueva tu suscripción para continuar agregando o editando información."
        )

    sub.plan_cargado = plan
    return sub

async def verificar_permiso(feature: str, current_user: Usuario, db: AsyncSession):
    """Verifica si el plan permite una función leyendo directamente de memoria sin consultas SQL redundantes"""
    if current_user.is_admin:
        return True

    # 1. Valida la suscripción activa (que ya nos trae el plan adjunto)
    sub = await verificar_suscripcion_activa(current_user, db)
    
    # 2. REGLA DE ORO: Si es trial, tiene permiso para todo
    if sub.plan_type and sub.plan_type.lower() == "trial":
        return True
    
    # 3. Leemos el plan directamente de memoria sin hacer SELECT adicional a la base de datos
    plan = getattr(sub, "plan_cargado", None)
    
    if not plan or not getattr(plan, feature, False):
        plan_sugerido = "ULTRA" if feature == "can_use_bot" else "PRO"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tu plan actual no incluye esta funcionalidad. Mejora a {plan_sugerido} para activarla."
        )
    return True

async def verificar_limite_pacientes(current_user: Usuario, db: AsyncSession):
    """Verifica el límite de creación diaria de pacientes reutilizando el plan en memoria (Cero SELECTs duplicados)"""
    # 1. BYPASS PARA EL ADMINISTRADOR
    if current_user.is_admin:
        return True

    # 2. Obtener suscripción y plan cargado en memoria en una sola llamada
    sub = await verificar_suscripcion_activa(current_user, db)
    
    # 3. Fecha local de Colombia
    hoy = datetime.now(COLOMBIA_TZ).date()
    
    # 4. Leemos el límite directamente del plan en memoria (sin segundo SELECT a PostgreSQL)
    plan_info = getattr(sub, "plan_cargado", None)
    limite_maximo = plan_info.limite_pacientes_diario if plan_info else 20
    
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