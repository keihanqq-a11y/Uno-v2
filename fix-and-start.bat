@echo off
setlocal
title UnoX Fix And Start
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX - FIX AND START
echo ========================================
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found.
  echo Install LTS from https://nodejs.org then try again.
  pause
  exit /b 1
)

echo Node version:
node -v
for /f "tokens=1 delims=." %%a in ('node -v') do set NODEMAJOR=%%a
set NODEMAJOR=%NODEMAJOR:v=%
if %NODEMAJOR% LSS 20 (
  echo ERROR: Need Node 20+. You have Node %NODEMAJOR%.
  echo Download LTS from https://nodejs.org
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json not found.
  echo You are in the wrong folder.
  echo Open the extracted Uno-v2-main folder that contains package.json,
  echo then run this file again from THERE.
  pause
  exit /b 1
)

if not exist "prisma\schema.prisma" (
  echo ERROR: prisma\schema.prisma not found.
  echo Your download is incomplete.
  echo Delete this folder, download a fresh ZIP from:
  echo   https://github.com/keihanqq-a11y/Uno-v2
  echo Extract it, then run fix-and-start.bat again.
  pause
  exit /b 1
)

echo Stopping old servers on 3000/3001...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

echo Clearing Next cache...
if exist .next rmdir /s /q .next

if exist ".git" (
  echo Pulling latest...
  git pull
) else (
  echo ZIP download detected - skipping git pull ^(that is OK^).
)

echo.
echo Installing packages (first time can take a few minutes)...
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
echo   Wait for BOTH lines:
echo     - Ready on http://localhost:3000
echo     - UnoX sockets ready on http://localhost:3001
echo   Then open Chrome:
echo     http://localhost:3000/play
echo   Hard refresh: Ctrl+Shift+R
echo ========================================
echo.

call npm run dev
echo.
echo Server stopped.
pause
