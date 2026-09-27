# backend_fastapi/endpoints/auth.py
import pytz
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Usuario, Plan, Subscription
from schemas.auth import LoginRequest, TokenResponse, UsuarioCreate
from utils.auth_utils import verificar_password, hash_password, crear_token_acceso
from services.bot_engine_service import poblar_plantilla_bot_doctor

COLOMBIA_TZ = pytz.timezone('America/Bogota')

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Buscamos el usuario siempre en minúsculas
    username_lower = login_data.username.lower()
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

    # 2. Buscamos la suscripción y el plan en una sola consulta unificada (Regla 7.E)
    query_sub = (
        select(Subscription, Plan)
        .outerjoin(Plan, (Subscription.plan_id == Plan.id) | (func.lower(Subscription.plan_type) == func.lower(Plan.nombre)))
        .where(Subscription.user_id == user.id)
    )
    sub_result = await db.execute(query_sub)
    row = sub_result.first()

    subscription, plan = row if row else (None, None)

    # 3. Validación estricta de vigencia para no otorgar permisos falsos en login
    esta_activo = False
    if user.is_admin:
        esta_activo = True
    elif subscription and subscription.status == "active" and subscription.current_period_end:
        ahora_col = datetime.now(COLOMBIA_TZ)
        db_fin = subscription.current_period_end
        fecha_fin = db_fin.astimezone(COLOMBIA_TZ) if getattr(db_fin, "tzinfo", None) else COLOMBIA_TZ.localize(db_fin)
        if fecha_fin > ahora_col:
            esta_activo = True

    token_data = {"sub": user.username}
    access_token = crear_token_acceso(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        nombre_usuario=user.nombres or user.username,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        is_admin=user.is_admin,
        permissions={
            "can_use_odontogram": True if user.is_admin else (plan.can_use_odontogram if (plan and esta_activo) else False),
            "can_use_multimedia": True if user.is_admin else (plan.can_use_multimedia if (plan and esta_activo) else False),
            "can_use_voice": True if user.is_admin else (plan.can_use_voice if (plan and esta_activo) else False),
            "can_export_history": True if user.is_admin else (plan.can_export_history if (plan and esta_activo) else False),
            "can_use_bot": True if user.is_admin else (plan.can_use_bot if (plan and esta_activo) else False),
        }
    )

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verificar si existe usuario o email duplicado
    username_lower = user_data.username.lower()
    email_lower = user_data.email.lower()
    result = await db.execute(
        select(Usuario).where((func.lower(Usuario.username) == username_lower) | (func.lower(Usuario.email) == email_lower))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El nombre de usuario o email ya están registrados")
    
    # 2. Obtener plan trial por defecto
    plan_result = await db.execute(select(Plan).where(Plan.nombre == 'trial'))
    plan = plan_result.scalar_one_or_none()

    ahora_bogota = datetime.now(COLOMBIA_TZ).replace(tzinfo=None)
    fecha_fin_trial = ahora_bogota + timedelta(days=7)

    try:
        nuevo_usuario = Usuario(
            username=username_lower,
            email=email_lower,
            password_hash=hash_password(user_data.password),
            nombres=user_data.nombres,
            apellidos=user_data.apellidos or "",
            nombre_consultorio=user_data.nombre_consultorio,
            telefono=user_data.telefono,
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

        # 3. Inicializar automáticamente su bot con la plantilla oficial usando sus datos reales
        await poblar_plantilla_bot_doctor(
            user_id=str(nuevo_usuario.id),
            doctor_nombre=f"{nuevo_usuario.nombres} {nuevo_usuario.apellidos or ''}".strip(),
            consultorio_nombre=nuevo_usuario.nombre_consultorio,
            telefono=nuevo_usuario.telefono
        )
        
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
            permissions={
                "can_use_odontogram": True if nuevo_usuario.is_admin else (plan.can_use_odontogram if plan else False),
                "can_use_multimedia": True if nuevo_usuario.is_admin else (plan.can_use_multimedia if plan else False),
                "can_use_voice": True if nuevo_usuario.is_admin else (plan.can_use_voice if plan else False),
                "can_export_history": True if nuevo_usuario.is_admin else (plan.can_export_history if plan else False),
                "can_use_bot": True if nuevo_usuario.is_admin else (plan.can_use_bot if plan else False),
            }
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en registro: {str(e)}")