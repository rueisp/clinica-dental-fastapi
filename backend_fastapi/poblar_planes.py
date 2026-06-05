# backend_fastapi/poblar_planes.py
import asyncio
from database import AsyncSessionLocal
from models import Plan
from sqlalchemy import select

async def poblar():
    async with AsyncSessionLocal() as db:
        # Verificar si ya existen planes
        result = await db.execute(select(Plan))
        if result.scalars().first():
            print("⚠️ Los planes ya existen en la base de datos.")
            return

        print("🌱 Creando planes en la nueva base de datos de EE. UU...")
        planes = [
            Plan(
                nombre="trial",
                descripcion="Prueba gratuita de 7 días",
                precio_cop=0,
                precio_mensual=0.0,
                duracion_dias=7,
                limite_pacientes_diario=5,
                activo=True,
                orden=1,
                can_use_odontogram=True,
                can_use_multimedia=True,
                can_use_voice=True,
                can_export_history=True
            ),
            Plan(
                nombre="basic",
                descripcion="Plan Básico Mensual",
                precio_cop=30000,
                precio_mensual=7.5,
                duracion_dias=30,
                limite_pacientes_diario=20,
                activo=True,
                orden=2,
                can_use_odontogram=False,
                can_use_multimedia=False,
                can_use_voice=False,
                can_export_history=True
            ),
            Plan(
                nombre="pro",
                descripcion="Plan Profesional Mensual",
                precio_cop=50000,
                precio_mensual=12.5,
                duracion_dias=30,
                limite_pacientes_diario=100,
                activo=True,
                orden=3,
                can_use_odontogram=True,
                can_use_multimedia=True,
                can_use_voice=True,
                can_export_history=True
            )
        ]
        db.add_all(planes)
        await db.commit()
        print("✅ ¡Planes creados con éxito!")

if __name__ == "__main__":
    asyncio.run(poblar())