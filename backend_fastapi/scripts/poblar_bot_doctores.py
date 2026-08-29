# backend_fastapi/scripts/poblar_bot_doctores.py
import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from database import AsyncSessionLocal
from models import Usuario
from sqlalchemy import select
from services.bot_engine_service import poblar_plantilla_bot_doctor

async def poblar_todos():
    print("🚀 Verificando e inicializando plantilla base para todos los doctores...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario))
        usuarios = result.scalars().all()
        print(f"📋 Encontrados {len(usuarios)} usuarios en la base de datos.")

        for u in usuarios:
            print(f"🔹 Procesando: {u.username} ({u.id})")
            await poblar_plantilla_bot_doctor(
                user_id=str(u.id),
                doctor_nombre=f"{u.nombres} {u.apellidos or ''}".strip(),
                consultorio_nombre=u.nombre_consultorio,
                telefono=u.telefono
            )

    print("✅ ¡Poblado completado exitosamente!")

if __name__ == "__main__":
    asyncio.run(poblar_todos())