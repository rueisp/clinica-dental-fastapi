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
    # 1. Buscamos el plan y la suscripción en una sola consulta usando plan_type para máxima compatibilidad
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_type == Plan.nombre)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.first()
    
    # 2. Cálculos de tiempo básicos
    hoy = datetime.now(timezone.utc).replace(tzinfo=None)
    dias_restantes = 0
    fecha_fin_str = "Vencido"
    status = "inactive"
    es_anual = False
    
    if row:
        sub, plan = row
        status = sub.status
        es_anual = plan.duracion_dias == 365
        if sub.current_period_end:
            # Extraemos una copia limpia del valor para evitar mutar el objeto de la DB
            db_date = sub.current_period_end
            fecha_fin = db_date.replace(tzinfo=None) if db_date.tzinfo else db_date
            dias_restantes = max(0, (fecha_fin - hoy).days)
            fecha_fin_str = fecha_fin.strftime('%Y-%m-%d')

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
            "can_use_odontogram": plan.can_use_odontogram if row else False,
            "can_use_multimedia": plan.can_use_multimedia if row else False,
            "can_use_voice": plan.can_use_voice if row else False,
            "can_export_history": plan.can_export_history if row else False,
        }
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

    # --- NUEVA REGLA DE SEGURIDAD: Bloquear si ya tiene un pago pendiente ---
    # Esto evita que el doctor reporte un pago y luego intente cambiar a otro plan 
    # antes de que tú lo apruebes.
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

    # --- NUEVA REGLA DE SEGURIDAD: Bloquear si ya tiene un plan de pago activo (No Trial) ---
    if suscripcion and suscripcion.status == "active" and suscripcion.plan_type.lower() != "trial":
        raise HTTPException(
            status_code=400,
            detail="Ya tienes un plan de pago activo. Para realizar un cambio o cancelación, por favor contacta a soporte técnico."
        )

    # --- REGLA 1: No repetir Trial (Tu regla original mantenida) ---
    if plan.nombre.lower() == "trial":
        if suscripcion and suscripcion.plan_type == "trial":
            raise HTTPException(
                status_code=400, 
                detail="Ya utilizaste tu periodo de prueba. Por favor elige un plan profesional."
            )

    # --- REGLA 2: Determinar estado (Activo para Trial, Informativo para otros) ---
    es_trial = plan.nombre.lower() == "trial"
    
    if es_trial:
        # El Trial es el único que se activa de inmediato en esta función
        if suscripcion:
            suscripcion.plan_type = plan.nombre
            suscripcion.status = "active"
            suscripcion.current_period_end = datetime.now() + timedelta(days=plan.duracion_dias)
        else:
            nueva_sub = Subscription(
                user_id=current_user.id,
                plan_type=plan.nombre,
                status="active",
                current_period_end=datetime.now() + timedelta(days=plan.duracion_dias)
            )
            db.add(nueva_sub)
        
        await db.commit()
        return {"success": True, "message": "Plan Trial activado", "status": "active"}

    else:
        # SI ES UN PLAN DE PAGO: 
        # No actualizamos la suscripción todavía (para que no gane los permisos Pro gratis).
        # Solo le decimos al frontend que debe ir a la pantalla de reporte.
        return {
            "success": True, 
            "message": "Solicitud recibida. Por favor adjunta tu comprobante de pago.", 
            "status": "pending_payment"
        }

@router.get("/mi-plan-detalle")
async def get_mi_plan_detalle(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Traer suscripción y datos del plan (Unión de tablas)
    result = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_type == Plan.nombre)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.first()
    
    if not row:
        return {"tiene_plan": False, "mensaje": "Sin suscripción activa"}
    
    sub, plan = row
    
    # 2. SINCRONIZACIÓN BOGOTÁ (Evitando mutar los objetos de la DB)
    ahora = datetime.now(COLOMBIA_TZ)
    
    # Extraemos copias limpias de las fechas de la DB
    db_fecha_fin = sub.current_period_end
    fecha_fin = db_fecha_fin.replace(tzinfo=None) if db_fecha_fin.tzinfo else db_fecha_fin
    fecha_fin = COLOMBIA_TZ.localize(fecha_fin)

    # 3. CÁLCULO DE DÍAS REALES (Sin pánico de '0 días')
    diferencia = fecha_fin - ahora
    segundos_restantes = diferencia.total_seconds()
    dias_restantes = max(0, int(segundos_restantes / 86400) + (1 if segundos_restantes % 86400 > 0 else 0))
    
    # 4. CÁLCULO DE PROGRESO (Barra Visual)
    db_fecha_inicio = sub.current_period_start or (db_fecha_fin - timedelta(days=plan.duracion_dias))
    fecha_inicio = db_fecha_inicio.replace(tzinfo=None) if db_fecha_inicio.tzinfo else db_fecha_inicio
    fecha_inicio = COLOMBIA_TZ.localize(fecha_inicio)
        
    duracion_total_segundos = (fecha_fin - fecha_inicio).total_seconds()
    tiempo_transcurrido_segundos = (ahora - fecha_inicio).total_seconds()
    
    # Porcentaje de 0 a 100
    if duracion_total_segundos > 0:
        porcentaje = int((tiempo_transcurrido_segundos / duracion_total_segundos) * 100)
    else:
        porcentaje = 0
        
    # Asegurar que el porcentaje no se salga de los límites
    porcentaje = min(100, max(0, porcentaje)) 
    
    return {
        "tiene_plan": True,
        "plan_nombre": plan.nombre,
        "plan_precio": plan.precio_cop,
        "limite_pacientes_diario": plan.limite_pacientes_diario,
        "fecha_fin": fecha_fin.strftime('%Y-%m-%d'),
        "dias_restantes": dias_restantes,
        "porcentaje_progreso": porcentaje,
        "status": sub.status,
        "es_anual": plan.duracion_dias == 365,
        # ✅ AGREGA ESTO AQUÍ ABAJO:
        "permissions": {
            "can_use_odontogram": plan.can_use_odontogram,
            "can_use_multimedia": plan.can_use_multimedia,
            "can_use_voice": plan.can_use_voice,
            "can_export_history": plan.can_export_history
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