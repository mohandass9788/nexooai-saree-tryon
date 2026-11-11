@echo off
title NeXooAi - Build and Export Docker Images
echo ============================================================
echo   NeXooAi: Building & Exporting Docker Images (Zero-Git Server)
echo ============================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Building Backend Image (nexooai-backend:latest)...
docker build -t nexooai-backend:latest -f backend/Dockerfile .
if errorlevel 1 goto error

echo.
echo [2/3] Building Frontend Image (nexooai-frontend:latest)...
docker build -t nexooai-frontend:latest -f frontend/Dockerfile ./frontend
if errorlevel 1 goto error

echo.
echo [3/3] Exporting images to nexooai-docker-images.tar...
docker save nexooai-backend:latest nexooai-frontend:latest -o nexooai-docker-images.tar
if errorlevel 1 goto error

echo.
echo ============================================================
echo   SUCCESS! Docker images exported to:
echo   %CD%\nexooai-docker-images.tar
echo.
echo   Now upload only these TWO files to your server:
echo   1. nexooai-docker-images.tar
echo   2. docker-compose.server.yml
echo ============================================================
goto end

:error
echo.
echo [ERROR] Docker build failed. Please check if Docker Desktop is running.
pause

:end
