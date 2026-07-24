@echo off
setlocal
title UnoX Fix And Start
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX - FIX AND START
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if %NODEMAJOR% LSS 20 (
  echo ERROR: Need Node 20+. You have Node %NODEMAJOR%.
  pause
  exit /b 1
)

echo Stopping old servers on 3000/3001...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

echo Clearing Next cache...
if exist .next rmdir /s /q .next

echo Pulling latest...
git pull
if errorlevel 1 (
  echo WARNING: git pull failed - continuing with local files
)

echo Generating Prisma client + updating DB...
call npx prisma generate
if errorlevel 1 (
  echo ERROR: prisma generate failed
  pause
  exit /b 1
)
call npx prisma db push --accept-data-loss --skip-generate
if errorlevel 1 (
  echo ERROR: prisma db push failed
  pause
  exit /b 1
)

echo Seeding...
call npm run db:seed
if errorlevel 1 (
  echo WARNING: seed failed - continuing
)

echo.
echo ========================================
echo   KEEP THIS WINDOW OPEN
echo   Wait for:
echo     - Ready on http://localhost:3000
echo     - UnoX sockets ready on http://localhost:3001
echo   Then open:
echo     http://localhost:3000/play
echo   If still broken, clear cookies for localhost.
echo ========================================
echo.

call npm run dev
pause
