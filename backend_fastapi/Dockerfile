FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc y habilitar salida de logs inmediata
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Crear usuario no-root sin privilegios para ejecución segura
RUN useradd -m -u 1000 appuser

# Instalar dependencias de Python usando wheels precompilados (sin inflar la imagen con compiladores)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente asignando propiedad directa al usuario no-root
COPY --chown=appuser:appuser . .

USER appuser

# Cloud Run inyecta la variable $PORT automáticamente (por defecto 8080).
# Escuchamos en 0.0.0.0 para que el tráfico externo sea ruteado correctamente.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8001}"]