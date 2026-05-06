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
    """Actualiza el plan del usuario en la tabla subscriptions"""
    # 1. Verificar que el plan existe en el catálogo maestro (tabla planes)
    result = await db.execute(select(Plan).where(Plan.nombre == request.plan_nombre))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado en el catálogo")
    
    # 2. Buscar la suscripción actual vinculada al UUID
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    suscripcion = result.scalar_one_or_none()
    
    # 3. Actualizar (o crear si no existe por algún error del trigger)
    if suscripcion:
        suscripcion.plan_type = plan.nombre
        suscripcion.status = "active"
        suscripcion.current_period_end = datetime.now() + timedelta(days=plan.duracion_dias)
    else:
        nueva_suscripcion = Subscription(
            user_id=current_user.id,
            plan_type=plan.nombre,
            status="active",
            current_period_end=datetime.now() + timedelta(days=plan.duracion_dias)
        )
        db.add(nueva_suscripcion)
    
    await db.commit()
    return {"success": True, "message": f"Plan actualizado a {plan.nombre}"}

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
    
    # Lógica de tiempos
    hoy = datetime.now(timezone.utc)
    fecha_fin = sub.current_period_end or (hoy + timedelta(days=7))
    dias_restantes = max(0, (fecha_fin - hoy).days)
    
    # Cálculo de progreso para la barra visual del frontend
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