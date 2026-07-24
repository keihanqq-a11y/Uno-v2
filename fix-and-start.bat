@echo off
setlocal EnableExtensions
title UnoX Fix And Start
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX FIX AND START
echo ========================================
echo Folder: %CD%
echo.
pause

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install LTS from https://nodejs.org
  pause
  exit /b 1
)

echo Node version:
node -v

for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if "%NODEMAJOR%"=="" set NODEMAJOR=0
if %NODEMAJOR% LSS 20 (
  echo ERROR: Need Node 20+. Install LTS from https://nodejs.org
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: Wrong folder. package.json not found.
  echo Run this from the Uno-v2-main folder.
  pause
  exit /b 1
)

if not exist "prisma\schema.prisma" (
  echo ERROR: prisma\schema.prisma missing. Re-download the ZIP.
  pause
  exit /b 1
)

echo Stopping old servers...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

if exist .next rmdir /s /q .next

echo.
echo [1/3] npm install...
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)

echo.
echo [2/3] database setup...
call npm run setup
if errorlevel 1 (
  echo ERROR: setup failed
  pause
  exit /b 1
)

echo.
echo [3/3] starting server...
echo KEEP THIS WINDOW OPEN
echo Then open http://localhost:3000/play
echo.

call npm run dev
echo.
echo Server stopped.
pause
