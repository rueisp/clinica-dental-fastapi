# backend_fastapi/app.py
from dotenv import load_dotenv

# 1. Cargar variables de entorno al puro inicio antes de cualquier módulo interno
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import init_cloudinary

# 2. Inicializar servicios externos globales
init_cloudinary()

# 3. Importación limpia y única de los 9 controladores de endpoints
from endpoints import (
    auth,
    planes,
    dashboard,
    pacientes,
    evoluciones,
    pagos,
    usuarios,
    whatsapp,
    bot_config
)

app = FastAPI(title="Clínica Dental API", version="1.0.0")

# 4. Configuración de CORS Restringida (Soporta producción, dominios propios y pruebas móviles en red local)
origins = [
    "https://cloudentapp.net",
    "https://www.cloudentapp.net",
    "https://frontend-nextjs-779789369655.us-east1.run.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://192\.168\.\d+\.\d+:3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Inclusión de rutas oficiales
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(planes.router, prefix="/api/planes", tags=["Planes"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(pacientes.router, prefix="/api/pacientes", tags=["Pacientes"])
app.include_router(evoluciones.router, prefix="/api/evoluciones", tags=["Evoluciones"])
app.include_router(pagos.router, prefix="/api", tags=["Pagos"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp Evolution"])
app.include_router(bot_config.router, prefix="/api", tags=["Configuración Bot"])

@app.get("/")
async def root():
    return {"message": "API Clínica Dental FastAPI", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok"}