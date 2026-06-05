# backend_fastapi/crear_tablas.py
import asyncio
from database import engine, Base
# Importamos los modelos para que SQLAlchemy los registre
import models 

async def crear():
    print("🚀 Creando tablas en la nueva base de datos de EE. UU...")
    async with engine.begin() as conn:
        # Esto lee todos los modelos heredados de Base y crea las tablas en PostgreSQL
        await conn.run_sync(Base.metadata.create_all)
    print("✅ ¡Tablas creadas con éxito!")

if __name__ == "__main__":
    asyncio.run(crear())