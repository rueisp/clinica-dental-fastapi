# test_models.py
import asyncio
from sqlalchemy import text
from database import get_db

async def test_models():
    print("Probando conexión y modelos...")
    try:
        async for session in get_db():
            # Probar consulta simple
            result = await session.execute(text("SELECT COUNT(*) FROM usuarios"))
            count = result.scalar()
            print(f"✅ Conexión exitosa! Total usuarios: {count}")
            break
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_models())