@echo off
title Servidor Backend - Clinica Dental
:: Entra a la carpeta del backend
cd /d "%~dp0backend_fastapi"
echo Iniciando servidor en el puerto 8001...
echo Host: 0.0.0.0 (Visible en red local)
:: Ejecuta el servidor usando el python del entorno virtual
.\venv_fastapi\Scripts\python -m uvicorn app:app --reload --host 0.0.0.0 --port 8001
pause