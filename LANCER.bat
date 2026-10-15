@echo off
chcp 65001 >nul
setlocal
title Microcredit BI - Demarrage

set "ROOT=%~dp0."
set "PYTHON=%ROOT%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=%ROOT%\.venv-cpython\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Python virtual environment not found.
  echo Create it with: python -m venv .venv
  echo Then install dependencies with: .venv\Scripts\python.exe -m pip install -r requirements.txt
  pause
  exit /b 1
)
where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm is not installed or not on PATH.
  echo Install Node.js and pnpm, then run this file again.
  pause
  exit /b 1
)

echo Starting FastAPI on port 8000...
start "API FastAPI" cmd /k "cd /d ""%ROOT%"" && ""%PYTHON%"" -m uvicorn api.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul

echo Starting Angular on port 4200...
start "Angular Frontend" cmd /k "cd /d ""%ROOT%\frontend"" && pnpm start"

echo.
echo Site:    http://localhost:4200
echo Swagger: http://localhost:8000/docs
echo Keep both terminal windows open. Close them to stop the services.

