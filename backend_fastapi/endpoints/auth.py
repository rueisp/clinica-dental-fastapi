# backend_fastapi/endpoints/auth.py
from utils.fechas import ahora_naive, fecha_esta_vigente
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.exc import IntegrityError
from database import get_db
from models import Usuario, Plan, Subscription
from schemas.auth import LoginRequest, TokenResponse, UsuarioCreate
from utils.auth_utils import verificar_password, hash_password, crear_token_acceso
from services.bot_engine_service import poblar_plantilla_bot_doctor

router = APIRouter()

def _construir_permisos(user: Usuario, plan: Plan | None, esta_activo: bool, plan_type: str | None = None) -> dict:
    """Genera la estructura de permisos oficial respetando privilegios de administrador, trial y vigencia"""
    if user.is_admin:
        return {
            "can_use_odontogram": True,
            "can_use_multimedia": True,
            "can_use_voice": True,
            "can_export_history": True,
            "can_use_bot": True,
        }

    # REGLA DE ORO: Trial activo tiene acceso total a todas las herramientas clínicas y bot
    es_trial = (plan and plan.nombre.lower() == "trial") or (plan_type and plan_type.lower() == "trial")
    if esta_activo and es_trial:
        return {
            "can_use_odontogram": True,
            "can_use_multimedia": True,
            "can_use_voice": True,
            "can_export_history": True,
            "can_use_bot": True,
        }

    valido = bool(plan and esta_activo)
    return {
        "can_use_odontogram": bool(plan.can_use_odontogram) if valido else False,
        "can_use_multimedia": bool(plan.can_use_multimedia) if valido else False,
        "can_use_voice": bool(plan.can_use_voice) if valido else False,
        "can_export_history": bool(plan.can_export_history) if valido else False,
        "can_use_bot": bool(plan.can_use_bot) if valido else False,
    }

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Buscamos el usuario sin espacios y en minúsculas
    username_lower = login_data.username.strip().lower()
    result = await db.execute(
        select(Usuario).where(func.lower(Usuario.username) == username_lower)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verificar_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Buscamos la suscripción y el plan en una sola consulta unificada con prioridad determinista por ID
    query_sub = (
        select(Subscription, Plan)
        .outerjoin(Plan, (Subscription.plan_id == Plan.id) | (func.lower(Subscription.plan_type) == func.lower(Plan.nombre)))
        .where(Subscription.user_id == user.id)
        .order_by(case((Subscription.plan_id == Plan.id, 1), else_=2))
    )
    sub_result = await db.execute(query_sub)
    row = sub_result.first()

    subscription, plan = row if row else (None, None)

    subscription, plan = row if row else (None, None)

    # 3. Validación estricta de vigencia para no otorgar permisos falsos en login
    esta_activo = False
    if user.is_admin:
        esta_activo = True
    elif subscription and subscription.status == "active":
        esta_activo = fecha_esta_vigente(subscription.current_period_end)

    token_data = {"sub": user.username}
    access_token = crear_token_acceso(token_data)
    plan_type_sub = subscription.plan_type if subscription else None
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        nombre_usuario=user.nombres or user.username,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        is_admin=user.is_admin,
        permissions=_construir_permisos(user, plan, esta_activo, plan_type=plan_type_sub)
    )

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # 1. Sanitizar y verificar duplicados de usuario o email
    username_lower = user_data.username.strip().lower()
    email_lower = user_data.email.strip().lower()
    
    result = await db.execute(
        select(Usuario.id).where(
            (func.lower(Usuario.username) == username_lower) | 
            (func.lower(Usuario.email) == email_lower)
        ).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El nombre de usuario o email ya están registrados")
    
    # 2. Obtener plan trial por defecto
    plan_result = await db.execute(select(Plan).where(func.lower(Plan.nombre) == 'trial'))
    plan = plan_result.scalar_one_or_none()

    ahora_bogota = ahora_naive()
    fecha_fin_trial = ahora_bogota + timedelta(days=7)

    # 3. Transacción atómica en PostgreSQL
    try:
        nuevo_usuario = Usuario(
            username=username_lower,
            email=email_lower,
            password_hash=hash_password(user_data.password),
            nombres=user_data.nombres.strip(),
            apellidos=(user_data.apellidos or "").strip(),
            nombre_consultorio=user_data.nombre_consultorio.strip() if user_data.nombre_consultorio else None,
            telefono=user_data.telefono.strip() if user_data.telefono else None,
            is_admin=False
        )
        db.add(nuevo_usuario)
        await db.flush() 

        nuevo_usuario_plan = Subscription(
            user_id=nuevo_usuario.id,
            plan_id=plan.id if plan else None,
            plan_type=plan.nombre if plan else 'trial',
            status="active",
            current_period_start=ahora_bogota,
            current_period_end=fecha_fin_trial
        )
        db.add(nuevo_usuario_plan)
        await db.commit()
        await db.refresh(nuevo_usuario)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario o email ya están registrados"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar el registro. Intenta nuevamente."
        )

    # 4. Inicialización resiliente del bot en Supabase (sin abortar cuenta ya creada ante latencia externa)
    try:
        await poblar_plantilla_bot_doctor(
            user_id=str(nuevo_usuario.id),
            doctor_nombre=f"{nuevo_usuario.nombres} {nuevo_usuario.apellidos or ''}".strip(),
            consultorio_nombre=nuevo_usuario.nombre_consultorio,
            telefono=nuevo_usuario.telefono
        )
    except Exception as e:
        print(f"⚠️ [Registro] Advertencia inicializando bot de Supabase para {nuevo_usuario.username}: {e}", flush=True)

    token_data = {"sub": nuevo_usuario.username}
    access_token = crear_token_acceso(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        nombre_usuario=nuevo_usuario.nombres or nuevo_usuario.username,
        nombres=nuevo_usuario.nombres,
        apellidos=nuevo_usuario.apellidos,
        email=nuevo_usuario.email,
        is_admin=nuevo_usuario.is_admin,
        permissions=_construir_permisos(nuevo_usuario, plan, esta_activo=True, plan_type="trial")
    )