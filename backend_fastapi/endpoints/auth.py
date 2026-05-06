from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Usuario, Plan, Subscription
from schemas.auth import LoginRequest, TokenResponse, UsuarioCreate
from utils.auth_utils import verificar_password, hash_password, crear_token_acceso
from datetime import datetime, timedelta
router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Iniciar sesión y obtener token JWT"""
    
    # Buscar usuario por username
    result = await db.execute(
        select(Usuario).where(Usuario.username == login_data.username)
    )
    user = result.scalar_one_or_none()
    
    # Verificar si existe y la contraseña es correcta
    if not user or not verificar_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    
    # Crear token
    token_data = {"sub": user.username}
    access_token = crear_token_acceso(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        nombre_usuario=user.nombres or user.username,
        nombres=user.nombres,
        apellidos=user.apellidos,
        is_admin=user.is_admin
    )

@router.post("/register", response_model=TokenResponse) # <--- Ahora sí coincide
async def register(
    user_data: UsuarioCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registrar un nuevo odontólogo y loguearlo automáticamente"""
    
    # 1. Verificar si el usuario o email ya existen
    result = await db.execute(
        select(Usuario).where((Usuario.username == user_data.username) | (Usuario.email == user_data.email))
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="El nombre de usuario o email ya están registrados"
        )
    
    # 2. Verificar que el plan_id exista
    plan_result = await db.execute(select(Plan).where(Plan.id == user_data.plan_id))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        trial_result = await db.execute(select(Plan).where(Plan.nombre == 'trial'))
        plan = trial_result.scalar_one_or_none()

    try:
        # 3. Crear nuevo usuario
        nuevo_usuario = Usuario(
            username=user_data.username,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            nombres=user_data.nombres,
            apellidos=user_data.apellidos,
            is_admin=False
        )
        
        db.add(nuevo_usuario)
        await db.flush() 

        # 4. Vincular con el Plan (Ajustado a tu models.py actual)
        # Eliminamos los campos que no existen en el modelo para evitar el error
        nuevo_usuario_plan = Subscription(
            user_id=nuevo_usuario.id,
            plan_type=plan.nombre, # 'trial', 'basico_mensual', etc.
            status="active",       # Usamos "active" para ser consistentes con el default
            current_period_end=datetime.now() + timedelta(days=plan.duracion_dias)
        )
        
        db.add(nuevo_usuario_plan)
        
        await db.commit()
        await db.refresh(nuevo_usuario)
        
        # --- 5. GENERAR TOKEN AUTOMÁTICO (Auto-Login) ---
        token_data = {"sub": nuevo_usuario.username}
        access_token = crear_token_acceso(token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            nombre_usuario=nuevo_usuario.nombres or nuevo_usuario.username,
            nombres=nuevo_usuario.nombres,
            apellidos=nuevo_usuario.apellidos,
            is_admin=nuevo_usuario.is_admin
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en el registro: {str(e)}")