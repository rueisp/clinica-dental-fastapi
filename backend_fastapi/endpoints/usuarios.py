import pytz

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from database import get_db
from dependencies.auth import get_current_user
from models import Usuario, Subscription, Plan
from utils.auth_utils import verificar_password, hash_password
from schemas.auth import PasswordUpdate, PerfilUpdate

COLOMBIA_TZ = pytz.timezone('America/Bogota')


router = APIRouter()

# --- ESQUEMAS DE PETICIÓN ---
class CambiarPlanRequest(BaseModel):
    plan_nombre: str  # Ejemplo: 'trial', 'basic', 'pro'

# --- ENDPOINTS ---

@router.get("/me")
async def get_usuario_actual(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Buscamos el plan y la suscripción en una sola consulta
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_type == Plan.nombre)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.first()
    
    ahora_colombia = datetime.now(COLOMBIA_TZ)
    dias_restantes = 0
    fecha_fin_str = "Vencido"
    status = "inactive"
    es_anual = False
    
    if row:
        sub, plan = row
        es_anual = plan.duracion_dias == 365
        
        if sub.current_period_end:
            db_date = sub.current_period_end
            if hasattr(db_date, "tzinfo") and db_date.tzinfo is not None:
                fecha_fin = db_date.astimezone(COLOMBIA_TZ)
            else:
                fecha_fin = COLOMBIA_TZ.localize(db_date)
            
            fecha_fin_str = fecha_fin.strftime('%Y-%m-%d')
            
            # Condición binaria estricta de corte
            if fecha_fin <= ahora_colombia:
                dias_restantes = 0
                status = "expired"
            else:
                status = sub.status
                segundos_restantes = (fecha_fin - ahora_colombia).total_seconds()
                dias_restantes = max(0, int(segundos_restantes // 86400) + (1 if segundos_restantes % 86400 > 0 else 0))
        else:
            status = "expired"

    return {
        "id": str(current_user.id),
        "nombres": current_user.nombres,
        "apellidos": current_user.apellidos,
        "nombre_consultorio": current_user.nombre_consultorio,
        "telefono": current_user.telefono,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "plan_info": {
            "nombre": plan.nombre if row else "Sin Plan",
            "dias_restantes": dias_restantes,
            "fecha_fin": fecha_fin_str,
            "status": status,
            "es_anual": es_anual
        },
        "permissions": {
            "can_use_odontogram": plan.can_use_odontogram if (row and status == "active") else (True if current_user.is_admin else False),
            "can_use_multimedia": plan.can_use_multimedia if (row and status == "active") else (True if current_user.is_admin else False),
            "can_use_voice": plan.can_use_voice if (row and status == "active") else (True if current_user.is_admin else False),
            "can_export_history": plan.can_export_history if (row and status == "active") else (True if current_user.is_admin else False),
            "can_use_bot": plan.can_use_bot if (row and status == "active") else (True if current_user.is_admin else False),
        }
    }

@router.put("/cambiar-plan")
async def cambiar_plan(
    request: CambiarPlanRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Buscar el plan destino en el catálogo
    result = await db.execute(select(Plan).where(Plan.nombre == request.plan_nombre))
    plan_destino = result.scalar_one_or_none()
    
    if not plan_destino:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    # 2. 🚫 BLOQUEO ABSOLUTO: El Trial solo se otorga al registrarse, nunca al cambiar de plan
    if plan_destino.nombre.lower() == "trial":
        raise HTTPException(
            status_code=400, 
            detail="El periodo de prueba gratuito solo está disponible una única vez al registrar la cuenta. Para continuar utilizando CloudentApp debes suscribirte a un plan profesional."
        )

    # 3. Buscar suscripción actual del doctor
    result_sub = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    suscripcion = result_sub.scalar_one_or_none()

    # 4. Candado de seguridad: Bloquear si ya tiene un pago pendiente de aprobación
    from models import PagoSuscripcion
    result_pago = await db.execute(
        select(PagoSuscripcion).where(
            PagoSuscripcion.user_id == current_user.id, 
            PagoSuscripcion.estado == "pendiente"
        )
    )
    if result_pago.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Ya tienes una solicitud de pago en verificación. Espera la aprobación del administrador."
        )

    # 5. Validación de suscripciones activas existentes (Reglas de Upgrade)
    if suscripcion and suscripcion.status == "active" and suscripcion.current_period_end:
        ahora_colombia = datetime.now(COLOMBIA_TZ)
        db_fin = suscripcion.current_period_end
        
        if hasattr(db_fin, "tzinfo") and db_fin.tzinfo is not None:
            fecha_fin = db_fin.astimezone(COLOMBIA_TZ)
        else:
            fecha_fin = COLOMBIA_TZ.localize(db_fin)

        # Solo aplicamos restricción de upgrade si el plan está REALMENTE VIGENTE
        if fecha_fin > ahora_colombia and suscripcion.plan_type.lower() != "trial":
            res_plan_actual = await db.execute(select(Plan).where(Plan.nombre == suscripcion.plan_type))
            plan_actual = res_plan_actual.scalar_one_or_none()

            if plan_actual and plan_destino.precio_cop <= plan_actual.precio_cop:
                raise HTTPException(
                    status_code=400,
                    detail="Tu plan actual sigue vigente. Para cambiar a un plan de menor valor, debes esperar a que termine tu ciclo."
                )

    # 6. Si es un plan de pago válido, enviar a reportar
    return {
        "success": True, 
        "message": "Solicitud de mejora recibida. Por favor adjunta tu comprobante de pago.", 
        "status": "pending_payment"
    }

@router.get("/mi-plan-detalle")
async def get_mi_plan_detalle(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_type == Plan.nombre)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.first()
    
    if not row:
        return {"tiene_plan": False, "mensaje": "Sin suscripción activa"}
    
    sub, plan = row
    ahora = datetime.now(COLOMBIA_TZ)
    
    db_fecha_fin = sub.current_period_end
    if not db_fecha_fin:
        return {
            "tiene_plan": True,
            "plan_nombre": plan.nombre,
            "status": "expired",
            "dias_restantes": 0,
            "porcentaje_progreso": 100
        }

    if hasattr(db_fecha_fin, "tzinfo") and db_fecha_fin.tzinfo is not None:
        fecha_fin = db_fecha_fin.astimezone(COLOMBIA_TZ)
    else:
        fecha_fin = COLOMBIA_TZ.localize(db_fecha_fin)

    # 1. EVALUACIÓN BINARIA DE EXPIRACIÓN
    if fecha_fin <= ahora:
        dias_restantes = 0
        status_final = "expired"
        porcentaje = 100
    else:
        status_final = sub.status
        segundos_restantes = (fecha_fin - ahora).total_seconds()
        dias_restantes = max(0, int(segundos_restantes // 86400) + (1 if segundos_restantes % 86400 > 0 else 0))
        
        # Cálculo de progreso visual
        fecha_inicio = fecha_fin - timedelta(days=plan.duracion_dias)
        duracion_total = (fecha_fin - fecha_inicio).total_seconds()
        tiempo_transcurrido = (ahora - fecha_inicio).total_seconds()
        porcentaje = min(100, max(0, int((tiempo_transcurrido / duracion_total) * 100))) if duracion_total > 0 else 0

    meses_es = {
        1: 'ene', 2: 'feb', 3: 'mar', 4: 'abr',
        5: 'may', 6: 'jun', 7: 'jul', 8: 'ago',
        9: 'sep', 10: 'oct', 11: 'nov', 12: 'dic'
    }
    
    fecha_inicio_calc = fecha_fin - timedelta(days=plan.duracion_dias)
    fecha_inicio_str = f"{meses_es[fecha_inicio_calc.month]} {fecha_inicio_calc.year}"
    fecha_fin_str = f"{meses_es[fecha_fin.month]} {fecha_fin.year}"
    
    return {
        "tiene_plan": True,
        "plan_nombre": plan.nombre,
        "plan_precio": plan.precio_cop,
        "plan_precio_usd": plan.precio_mensual, 
        "limite_pacientes_diario": plan.limite_pacientes_diario,
        "fecha_inicio": fecha_inicio_str,
        "fecha_fin": fecha_fin_str,
        "dias_restantes": dias_restantes,
        "porcentaje_progreso": porcentaje,
        "status": status_final,
        "es_anual": plan.duracion_dias == 365,
        "permissions": {
            "can_use_odontogram": plan.can_use_odontogram if status_final == "active" else False,
            "can_use_multimedia": plan.can_use_multimedia if status_final == "active" else False,
            "can_use_voice": plan.can_use_voice if status_final == "active" else False,
            "can_export_history": plan.can_export_history if status_final == "active" else False,
            "can_use_bot": plan.can_use_bot if status_final == "active" else False,
        }
    }


@router.put("/me")
async def actualizar_perfil(
    request: PerfilUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza la información básica y de marca del odontólogo"""
    current_user.nombres = request.nombres
    current_user.apellidos = request.apellidos
    current_user.nombre_consultorio = request.nombre_consultorio
    current_user.telefono = request.telefono
    
    await db.commit()
    return {"success": True, "message": "Perfil actualizado correctamente"}

@router.put("/cambiar-password")
async def cambiar_password(
    request: PasswordUpdate,    
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cambia la contraseña validando la anterior"""
    # 1. Verificar que la contraseña anterior sea correcta
    if not verificar_password(request.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    
    # 2. Hashear y guardar la nueva
    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    
    return {"success": True, "message": "Contraseña actualizada con éxito"}