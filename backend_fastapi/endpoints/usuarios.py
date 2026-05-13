import pytz

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from database import get_db
from dependencies.auth import get_current_user
from models import Usuario, Subscription, Plan

router = APIRouter()

# --- ESQUEMAS DE PETICIÓN ---
class CambiarPlanRequest(BaseModel):
    plan_nombre: str  # Ejemplo: 'trial', 'basic', 'pro'

# --- ENDPOINTS ---

@router.get("/me")
async def get_usuario_actual(current_user: Usuario = Depends(get_current_user)):
    """Devuelve la información básica del perfil del odontólogo logueado"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "nombres": current_user.nombres,
        "is_admin": current_user.is_admin
    }

@router.put("/cambiar-plan")
async def cambiar_plan(
    request: CambiarPlanRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Buscar el plan en el catálogo
    result = await db.execute(select(Plan).where(Plan.nombre == request.plan_nombre))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    # 2. Buscar suscripción actual
    result_sub = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    suscripcion = result_sub.scalar_one_or_none()

    # --- REGLA 1: No repetir Trial ---
    if plan.nombre.lower() == "trial":
        # Verificamos si alguna vez ha tenido un plan que NO sea nulo y que sea diferente a "expirado"
        # O si tienes una columna 'trial_usado' en Usuario (recomendado)
        if suscripcion and suscripcion.plan_type == "trial":
            raise HTTPException(
                status_code=400, 
                detail="Ya utilizaste tu periodo de prueba. Por favor elige un plan profesional."
            )

    # --- REGLA 2: Determinar estado (Activo para Trial, Pendiente para otros) ---
    es_trial = plan.nombre.lower() == "trial"
    nuevo_estado = "active" if es_trial else "pending_payment"

    if suscripcion:
        suscripcion.plan_type = plan.nombre
        suscripcion.status = nuevo_estado
        # Solo asignamos fecha si es trial; si es pago, la asignaremos cuando tú lo apruebes
        if es_trial:
            suscripcion.current_period_end = datetime.now() + timedelta(days=plan.duracion_dias)
    else:
        nueva_sub = Subscription(
            user_id=current_user.id,
            plan_type=plan.nombre,
            status=nuevo_estado,
            current_period_end=datetime.now() + timedelta(days=plan.duracion_dias) if es_trial else None
        )
        db.add(nueva_sub)
    
    await db.commit()

    mensaje = "Plan Trial activado" if es_trial else "Solicitud recibida. Por favor adjunta tu comprobante de pago."
    return {"success": True, "message": mensaje, "status": nuevo_estado}

@router.get("/mi-plan-detalle")
async def get_mi_plan_detalle(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el detalle completo de la suscripción para el Dashboard y la página de Planes"""
    
    # Unión (JOIN) entre Subscription (quién es) y Plan (qué beneficios tiene)
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_type == Plan.nombre)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.first()
    
    if not row:
        return {
            "tiene_plan": False,
            "mensaje": "No se encontró información de suscripción para este usuario"
        }
    
    sub, plan = row
    
    # ✅ CORRECCIÓN: Usar zona horaria de Colombia
    colombia_tz = pytz.timezone('America/Bogota')
    hoy = datetime.now(colombia_tz)
    
    # Aseguramos que fecha_fin tenga zona horaria para poder comparar
    if sub.current_period_end:
        # Si la fecha en DB no tiene zona horaria, se la asignamos
        fecha_fin = sub.current_period_end.replace(tzinfo=pytz.UTC).astimezone(colombia_tz)
    else:
        fecha_fin = hoy + timedelta(days=7)
    
    # Cálculo de días (usando total_seconds para mayor precisión)
    segundos_restantes = (fecha_fin - hoy).total_seconds()
    dias_restantes = max(0, int(segundos_restantes / 86400))
    
    # Cálculo de progreso (0% al inicio, 100% al vencer)
    total_dias = plan.duracion_dias if plan.duracion_dias > 0 else 30
    dias_transcurridos = total_dias - dias_restantes
    porcentaje = int((dias_transcurridos / total_dias) * 100)
    porcentaje = min(100, max(0, porcentaje)) 
    
    return {
        "tiene_plan": True,
        "plan_nombre": plan.nombre,
        "plan_precio": plan.precio_cop,
        "limite_pacientes_diario": plan.limite_pacientes_diario,
        "fecha_fin": fecha_fin.strftime('%Y-%m-%d'),
        "dias_restantes": dias_restantes,
        "porcentaje_progreso": porcentaje,
        "es_trial": sub.plan_type == 'trial',
        "status": sub.status
    }