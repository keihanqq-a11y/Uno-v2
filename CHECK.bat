@echo off
setlocal EnableExtensions
title UnoX - Open This First
cd /d "%~dp0"

echo.
echo ========================================
echo   UnoX helper
echo ========================================
echo.
echo This window will stay open so you can see errors.
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo NODE: MISSING
  echo Install from https://nodejs.org  (LTS)
) else (
  echo NODE:
  node -v
  npm -v
)

echo.
if exist "package.json" (
  echo package.json: FOUND
) else (
  echo package.json: MISSING - wrong folder
)

if exist "prisma\schema.prisma" (
  echo prisma schema: FOUND
) else (
  echo prisma schema: MISSING
)

echo.
echo Next step: run start.bat from this same folder.
echo Or in this window type:
echo   start.bat
echo.
pause
