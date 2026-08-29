# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from endpoints import dashboard, pacientes, evoluciones, pagos, auth, planes, usuarios, whatsapp, bot_config

# 1. Cargar el entorno al puro inicio
load_dotenv()

# 2. IMPORTANTE: Inicializar servicios externos
from config import init_cloudinary
init_cloudinary() # <--- Al llamar a la función, el linter ya no marcará error

# 3. Luego importar los endpoints
from endpoints import dashboard, pacientes, evoluciones, pagos, auth, planes, usuarios

app = FastAPI(title="Clínica Dental API", version="1.0.0")

# Configuración de CORS Restringida (Soporta IPs locales dinámicas para pruebas en móvil)
origins = [
    "https://frontend-nextjs-779789369655.us-east1.run.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://192\.168\.\d+\.\d+:3000", # Permite cualquier IP local (ej. 192.168.1.8, 192.168.1.10, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de rutas (una sola vez por módulo)
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