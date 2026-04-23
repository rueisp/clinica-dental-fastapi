# create_admin.py
import asyncio
from database import AsyncSessionLocal
from models_fastapi import Usuario
from utils.auth_utils import hash_password
from sqlalchemy import select

async def create_admin():
    async with AsyncSessionLocal() as db:
        # Verificar si ya existe admin
        result = await db.execute(select(Usuario).where(Usuario.username == "admin"))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = Usuario(
                username="admin",
                email="admin@clinica.com",
                password_hash=hash_password("admin123"),
                nombre_completo="Administrador",
                is_admin=True
            )
            db.add(admin)
            await db.commit()
            print("✅ Usuario admin creado correctamente")
            print("   Usuario: admin")
            print("   Contraseña: admin123")
        else:
            print("⚠️ El usuario admin ya existe")
            print(f"   ID: {admin.id}")
            print(f"   Email: {admin.email}")

if __name__ == "__main__":
    asyncio.run(create_admin())