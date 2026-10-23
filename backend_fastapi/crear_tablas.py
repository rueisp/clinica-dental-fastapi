# backend_fastapi/crear_tablas.py
import asyncio
import sys
from database import engine, Base
import models  # noqa: F401 - Registra los modelos en Base.metadata

async def crear():
    print("🚀 Verificando y creando tablas en la base de datos PostgreSQL...", flush=True)
    try:
        async with engine.begin() as conn:
            # Crea únicamente tablas inexistentes (CREATE TABLE IF NOT EXISTS) sin alterar datos existentes
            await conn.run_sync(Base.metadata.create_all)
        print("✅ ¡Estructura de tablas verificada con éxito!", flush=True)
    except Exception as e:
        print(f"❌ Error creando tablas en PostgreSQL: {e}", flush=True)
        sys.exit(1)
    finally:
        # Cerrar el pool de conexiones de asyncpg limpiamente
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(crear())