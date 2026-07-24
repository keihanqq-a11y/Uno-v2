@echo off
title UNO Premium
cd /d "%~dp0"

echo.
echo ========================================
echo   UNO Premium - starting...
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Download LTS from https://nodejs.org
  echo Then install it, restart your PC, and try again.
  echo.
  pause
  exit /b 1
)

echo Node found:
node -v
npm -v
echo.

if not exist "package.json" (
  echo ERROR: package.json not found.
  echo Make sure this file is inside the Uno-v2 folder.
  echo.
  pause
  exit /b 1
)

echo Installing packages (first time can take a minute)...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo Setting up database...
call npm run setup
if errorlevel 1 (
  echo ERROR: setup failed.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Starting server...
echo   KEEP THIS WINDOW OPEN
echo   Then open Chrome to:
echo   http://localhost:3000/play
echo ========================================
echo.

call npm run dev
echo.
echo Server stopped.
pause
