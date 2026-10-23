# backend_fastapi/create_admin.py
import os
import sys
import asyncio
from dotenv import load_dotenv

# Cargar variables de entorno locales
load_dotenv()

from database import AsyncSessionLocal, engine
from models import Usuario
from utils.auth_utils import hash_password
from sqlalchemy import select

async def create_admin():
    print("🔐 Verificando cuenta de Administrador del sistema...", flush=True)

    admin_username = (os.getenv("ADMIN_USERNAME") or "admin").strip().lower()
    admin_email = (os.getenv("ADMIN_EMAIL") or "admin@cloudentapp.net").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "AdminCloudent2026*").strip()

    if len(admin_password) < 8:
        print("❌ Error de seguridad: ADMIN_PASSWORD debe tener al menos 8 caracteres.", flush=True)
        sys.exit(1)

    try:
        async with AsyncSessionLocal() as db:
            # 1. Verificar si ya existe el usuario admin
            result = await db.execute(select(Usuario).where(Usuario.username == admin_username))
            admin = result.scalar_one_or_none()
            
            if not admin:
                admin = Usuario(
                    username=admin_username,
                    email=admin_email,
                    password_hash=hash_password(admin_password),
                    nombres="Administrador",
                    apellidos="Sistema",
                    is_admin=True
                )
                db.add(admin)
                await db.commit()
                print("✅ Cuenta de Administrador creada exitosamente.", flush=True)
                print(f"   • Usuario: {admin_username}", flush=True)
                print(f"   • Email:   {admin_email}", flush=True)
                print("   • Contraseña: [CONFIGURADA DE FORMA SEGURA - NO EXPUESTA EN LOGS]", flush=True)
            else:
                print("ℹ️ La cuenta de Administrador ya existe en la base de datos.", flush=True)
                print(f"   • ID:      {admin.id}", flush=True)
                print(f"   • Usuario: {admin.username}", flush=True)
                print(f"   • Email:   {admin.email}", flush=True)
    except Exception as e:
        print(f"❌ Error verificando cuenta admin: {e}", flush=True)
        sys.exit(1)
    finally:
        # Cerrar el pool de conexiones de forma limpia
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_admin())