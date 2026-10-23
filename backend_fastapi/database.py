# backend_fastapi/database.py
import os
import ssl
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
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

# Contexto TLS cifrado para el Transaction Pooler de Supabase (puerto 6543)
# Requiere CERT_NONE porque el pooler de Supabase opera con su propia cadena de certificados de infraestructura
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# NullPool es obligatorio en Cloud Run con CPU Throttling y PgBouncer de Supabase
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
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

class Base(DeclarativeBase):
    pass

async def get_db():
    """
    Generador de sesiones asíncronas para inyección de dependencias.
    Los endpoints que persisten datos controlan explícitamente su commit.
    Garantiza rollback automático ante excepciones y cierre de sesión.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise