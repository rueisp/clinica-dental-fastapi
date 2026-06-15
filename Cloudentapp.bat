@echo off
title Iniciar Proyecto Completo - Cloudentapp (FastAPI + Next.js)
echo ===================================================
echo   INICIANDO CLOUDENTAPP (FASTAPI + NEXT.JS)
echo ===================================================
echo.

:: 1. Iniciar el Backend de FastAPI en una nueva ventana
echo [1/2] Iniciando Servidor Backend (Puerto 8001)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend_fastapi && .\venv_fastapi\Scripts\python -m uvicorn app:app --reload --host 0.0.0.0 --port 8001"

:: Esperar 2 segundos para dar tiempo al backend de iniciar
timeout /t 2 /nobreak >nul

:: 2. Iniciar el Frontend de Next.js en una nueva ventana
echo [2/2] Iniciando Servidor Frontend (Puerto 3000)...
start "Frontend - Next.js" cmd /k "cd /d %~dp0frontend_nextjs && npm run dev"

echo.
echo ===================================================
echo   ¡Todo listo! 
echo   - Backend corriendo en: http://localhost:8001
echo   - Frontend corriendo en: http://localhost:3000
echo ===================================================
echo Puedes cerrar esta ventana principal. Las otras dos seguiran corriendo.
pause