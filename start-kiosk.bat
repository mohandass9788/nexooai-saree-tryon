@echo off
title NeXooAi Virtual Saree Try-On Kiosk
echo ============================================================
echo   NeXooAi Virtual Saree Try-On — Launching Kiosk Suite
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend FastAPI server on port 8000...
start "NeXooAi Backend (Port 8000)" cmd /k "cd /d %~dp0 && set PYTHONPATH=%~dp0 && .\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

powershell -NoProfile -Command "Start-Sleep -Seconds 2"

echo [2/2] Starting Frontend Kiosk Angular on port 4200...
start "NeXooAi Frontend (Port 4200)" cmd /k "cd /d %~dp0frontend && npm run start"

powershell -NoProfile -Command "Start-Sleep -Seconds 4"

echo.
echo Opening Google Chrome to http://localhost:4200 ...
start "" "http://localhost:4200"

echo.
echo ============================================================
echo   NeXooAi Kiosk is running!
echo   Frontend: http://localhost:4200
echo   Backend:  http://127.0.0.1:8000
echo   Docs:     http://127.0.0.1:8000/docs
echo ============================================================
