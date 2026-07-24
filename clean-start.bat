@echo off
setlocal
title UnoX Clean Start
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX - CLEAN START
echo ========================================
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

echo Node version:
node -v
for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if %NODEMAJOR% LSS 20 (
  echo ERROR: Need Node 20+. You have Node %NODEMAJOR%.
  pause
  exit /b 1
)

echo.
echo Stopping any old Node servers on 3000/3001...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

echo.
echo Deleting old build + DB caches...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
if exist .next rmdir /s /q .next
if exist prisma\dev.db del /f /q prisma\dev.db
if exist prisma\dev.db-journal del /f /q prisma\dev.db-journal

echo.
echo Installing fresh packages...
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)

echo.
echo Setting up database...
call npm run setup
if errorlevel 1 (
  echo ERROR: setup failed
  pause
  exit /b 1
)

echo.
echo ========================================
echo   KEEP THIS WINDOW OPEN
echo   Wait until you see BOTH:
echo     - Ready on http://localhost:3000
echo     - sockets ready on http://localhost:3001
echo   Then open Chrome:
echo   http://localhost:3000/play
echo ========================================
echo.

call npm run dev
echo.
echo Server stopped.
pause
