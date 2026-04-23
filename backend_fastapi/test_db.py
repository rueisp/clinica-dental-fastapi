import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    database_url = os.getenv("DATABASE_URL")
    # Ocultar contraseña por seguridad
    print(f"Probando conexión a Supabase...")
    
    try:
        engine = create_async_engine(database_url, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ ¡Conexión exitosa a Supabase!")
        await engine.dispose()
    except Exception as e:
        print(f"❌ Error de conexión: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())