@echo off
setlocal EnableExtensions
title UnoX Start
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX START
echo ========================================
echo Folder: %CD%
echo.
echo If this window closes by itself, run it from Command Prompt instead.
echo.
pause

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js is not installed or not in PATH.
  echo.
  echo 1. Go to https://nodejs.org
  echo 2. Download LTS and install
  echo 3. CLOSE this window
  echo 4. Open a NEW start.bat
  echo.
  pause
  exit /b 1
)

echo Node version:
node -v
npm -v
echo.

for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if "%NODEMAJOR%"=="" set NODEMAJOR=0
if %NODEMAJOR% LSS 20 (
  echo.
  echo ERROR: Need Node 20+. You have Node %NODEMAJOR%.
  echo Install LTS from https://nodejs.org then reopen this file.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json not found in:
  echo %CD%
  echo.
  echo Open the Uno-v2-main folder that contains package.json
  echo then run start.bat from there.
  echo.
  pause
  exit /b 1
)

if not exist "prisma\schema.prisma" (
  echo ERROR: prisma\schema.prisma missing.
  echo Re-download the ZIP from https://github.com/keihanqq-a11y/Uno-v2
  echo.
  pause
  exit /b 1
)

echo Stopping old servers...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

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
echo.
echo ========================================
echo   KEEP THIS WINDOW OPEN
echo   Wait for BOTH:
echo     Ready on http://localhost:3000
echo     UnoX sockets ready on http://localhost:3001
echo   Then open:
echo     http://localhost:3000/play
echo ========================================
echo.

call npm run dev
set ERR=%ERRORLEVEL%
echo.
echo Server stopped. Exit code: %ERR%
pause
exit /b %ERR%
