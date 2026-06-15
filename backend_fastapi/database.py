# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import NullPool  # <--- AGREGADO
import os
from dotenv import load_dotenv
import ssl 

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Inyectar dinámicamente el parámetro para desactivar la caché de sentencias preparadas en SQLAlchemy 2.0
if DATABASE_URL and "prepared_statement_cache_size" not in DATABASE_URL:
    if "?" in DATABASE_URL:
        DATABASE_URL += "&prepared_statement_cache_size=0"
    else:
        DATABASE_URL += "?prepared_statement_cache_size=0"

# Crear un contexto SSL personalizado que deshabilite la verificación estricta
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,  # <--- AGREGADO: Desactiva el pool local
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,  # Parámetro nativo de asyncpg
        "ssl": ssl_context
    }
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()