# backend_fastapi/database.py
import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import NullPool

load_dotenv()

raw_url = os.getenv("DATABASE_URL", "").strip()

# Asegurar el driver asíncrono asyncpg si la URL viene en formato postgresql plano
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

DATABASE_URL = raw_url

# Inyectar parámetro para desactivar sentencias preparadas en el pooler transaccional de Supabase
if DATABASE_URL and "prepared_statement_cache_size" not in DATABASE_URL:
    separador = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separador}prepared_statement_cache_size=0"

# Contexto SSL seguro para Supabase
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
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
    """Generador de sesiones asíncronas para inyección de dependencias con rollback ante errores"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()