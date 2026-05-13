from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Usuario, Plan, Subscription
from schemas.auth import LoginRequest, TokenResponse, UsuarioCreate
from utils.auth_utils import verificar_password, hash_password, crear_token_acceso
from datetime import datetime, timedelta
from models import Usuario, Plan, Subscription


router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Buscamos el usuario siempre en minúsculas (.lower())
    username_lower = login_data.username.lower()
    result = await db.execute(
        select(Usuario).where(Usuario.username == username_lower)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verificar_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # 2. Buscamos el plan
    plan_result = await db.execute(
        select(Plan).join(Subscription, Subscription.plan_type == Plan.nombre).where(Subscription.user_id == user.id)
    )
    plan = plan_result.scalar_one_or_none()

    token_data = {"sub": user.username}
    access_token = crear_token_acceso(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        nombre_usuario=user.nombres or user.username,
        nombres=user.nombres,
        apellidos=user.apellidos,
        is_admin=user.is_admin,
        permissions={
            "can_use_odontogram": True if user.is_admin else (plan.can_use_odontogram if plan else False),
            "can_use_multimedia": True if user.is_admin else (plan.can_use_multimedia if plan else False),
            "can_use_voice": True if user.is_admin else (plan.can_use_voice if plan else False),
            "can_export_history": True if user.is_admin else (plan.can_export_history if plan else False),
        }
    )

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verificar si existe (usando lower)
    username_lower = user_data.username.lower()
    result = await db.execute(
        select(Usuario).where((Usuario.username == username_lower) | (Usuario.email == user_data.email))
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El nombre de usuario o email ya están registrados")
    
    # 2. Obtener plan trial por defecto
    plan_result = await db.execute(select(Plan).where(Plan.nombre == 'trial'))
    plan = plan_result.scalar_one_or_none()

    try:
        nuevo_usuario = Usuario(
            username=username_lower,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            nombres=user_data.nombres,
            apellidos=user_data.apellidos,
            is_admin=False
        )
        db.add(nuevo_usuario)
        await db.flush() 

        nuevo_usuario_plan = Subscription(
            user_id=nuevo_usuario.id,
            plan_type=plan.nombre if plan else 'trial',
            status="active",
            current_period_end=datetime.now() + timedelta(days=7)
        )
        db.add(nuevo_usuario_plan)
        await db.commit()
        await db.refresh(nuevo_usuario)
        
        token_data = {"sub": nuevo_usuario.username}
        access_token = crear_token_acceso(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            nombre_usuario=nuevo_usuario.nombres or nuevo_usuario.username,
            nombres=nuevo_usuario.nombres,
            apellidos=nuevo_usuario.apellidos,
            is_admin=nuevo_usuario.is_admin,
            permissions={
                "can_use_odontogram": True if nuevo_usuario.is_admin else (plan.can_use_odontogram if plan else False),
                "can_use_multimedia": True if nuevo_usuario.is_admin else (plan.can_use_multimedia if plan else False),
                "can_use_voice": True if nuevo_usuario.is_admin else (plan.can_use_voice if plan else False),
                "can_export_history": True if nuevo_usuario.is_admin else (plan.can_export_history if plan else False),
            }
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")