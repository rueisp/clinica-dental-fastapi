from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints import dashboard, pacientes, evoluciones, pagos, auth  # ← Agregar auth

app = FastAPI(title="Clínica Dental API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(pacientes.router, prefix="/api", tags=["pacientes"])
app.include_router(evoluciones.router, prefix="/api", tags=["evoluciones"])
app.include_router(pagos.router, prefix="/api", tags=["pagos"])
app.include_router(auth.router, prefix="/api/auth", tags=["autenticación"])  # ← Agregar esta línea

@app.get("/")
async def root():
    return {"message": "API Clínica Dental FastAPI", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok"}