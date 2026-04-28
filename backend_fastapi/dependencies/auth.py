# dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Usuario

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    # Si no hay token, usar token de prueba
    if not credentials:
        token = "test_token_123"
    else:
        token = credentials.credentials
    
    # Acepta token de prueba
    if token == "test_token_123":
        # Buscar usuario existente
        result = await db.execute(select(Usuario).limit(1))
        user = result.scalar_one_or_none()
        
        # Si no hay usuario, crear uno temporal
        if not user:
            user = Usuario(
                username="admin",
                nombre_completo="Administrador",
                email="admin@clinica.com",
                is_admin=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        return user
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )