# endpoints/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models_fastapi import Usuario
from schemas import LoginRequest, TokenResponse, UsuarioCreate
from utils.auth_utils import verificar_password, hash_password, crear_token_acceso

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
        nombre_usuario=user.nombre_completo or user.username,
        is_admin=user.is_admin
    )

@router.post("/register")
async def register(
    user_data: UsuarioCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registrar un nuevo usuario (endpoint abierto)"""
    
    # Verificar si el username ya existe
    result = await db.execute(
        select(Usuario).where(Usuario.username == user_data.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )
    
    # Verificar si el email ya existe
    result = await db.execute(
        select(Usuario).where(Usuario.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear nuevo usuario
    nuevo_usuario = Usuario(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        nombre_completo=user_data.nombre_completo,
        is_admin=False  # Por defecto no es admin
    )
    
    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)
    
    return {
        "success": True,
        "message": "Usuario creado exitosamente",
        "user_id": nuevo_usuario.id
    }