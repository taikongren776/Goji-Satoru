@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.19 or newer is required.
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run dev -- --open "/?character=/models/character-production/whitehair-preview.json"
if errorlevel 1 pause
