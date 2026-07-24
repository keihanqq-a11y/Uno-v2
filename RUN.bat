@echo off
setlocal EnableExtensions
title UnoX
cd /d "%~dp0"

echo Folder: %CD%
echo.

if not exist "package.json" (
  echo ERROR: Wrong folder. Open Uno-v2-main then run this again.
  goto END
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Install Node LTS from https://nodejs.org
  goto END
)

echo Node:
node -v

echo.
echo Stopping old servers...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>nul

echo.
echo Installing... this can take a few minutes
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo ERROR: npm install failed
  goto END
)

echo.
echo Setting up database...
call npm run setup
if errorlevel 1 (
  echo ERROR: setup failed
  goto END
)

echo.
echo STARTING SITE NOW
echo Keep this window open
echo When you see localhost:3000 open Chrome to http://localhost:3000/play
echo.

call npm run dev

:END
echo.
echo Done / stopped.
pause
