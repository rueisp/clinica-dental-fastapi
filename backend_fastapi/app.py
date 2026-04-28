from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints import dashboard, pacientes, evoluciones, pagos, auth

app = FastAPI(title="Clínica Dental API", version="1.0.0")

# Configuración de CORS limpia
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de rutas (una sola vez por módulo)
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(pacientes.router, prefix="/api", tags=["Pacientes"])
app.include_router(evoluciones.router, prefix="/api", tags=["Evoluciones"])
app.include_router(pagos.router, prefix="/api", tags=["Pagos"])

@app.get("/")
async def root():
    return {"message": "API Clínica Dental FastAPI", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok"}