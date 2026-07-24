@echo off
setlocal
title UnoX
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX
echo ========================================
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install LTS from https://nodejs.org then reopen this file.
  pause
  exit /b 1
)

echo Node:
node -v
npm -v
echo.

for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if %NODEMAJOR% LSS 20 (
  echo.
  echo ERROR: Node.js is too old.
  echo You have Node %NODEMAJOR%, but this app needs Node 20+.
  echo.
  echo 1^) Go to https://nodejs.org
  echo 2^) Download LTS and install
  echo 3^) CLOSE this window
  echo 4^) Open a NEW PowerShell / start.bat
  echo.
  pause
  exit /b 1
)

echo Stopping old servers...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

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
echo   Open Chrome to:
echo   http://localhost:3000/play
echo ========================================
echo.

call npm run dev
echo.
echo Server stopped.
pause
