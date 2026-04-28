import os
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Test funcionando en Cloud Run"}

if __name__ == "__main__":
    # Lee el puerto que le asigne Cloud Run o usa el 8001 por defecto
    port = int(os.environ.get("PORT", 8001))
    # IMPORTANTE: host="0.0.0.0" es obligatorio
    uvicorn.run(app, host="0.0.0.0", port=port)