@echo off
title UNO Diagnose
cd /d "%~dp0"
set OUT=%USERPROFILE%\Desktop\uno-diagnose.txt

echo Writing diagnosis to:
echo %OUT%
echo.

(
  echo === UNO DIAGNOSE ===
  echo Time: %DATE% %TIME%
  echo Folder: %CD%
  echo.

  echo --- node ---
  where node 2>&1
  node -v 2>&1
  npm -v 2>&1
  echo.

  echo --- files ---
  if exist package.json (echo package.json: YES) else (echo package.json: NO)
  if exist .env (echo .env: YES) else (echo .env: NO)
  if exist prisma\schema.prisma (echo prisma schema: YES) else (echo prisma schema: NO)
  if exist prisma\dev.db (echo prisma\dev.db: YES) else (echo prisma\dev.db: NO)
  echo.

  echo --- .env ---
  if exist .env type .env
  echo.

  echo --- git ---
  git rev-parse --abbrev-ref HEAD 2>&1
  git log -1 --oneline 2>&1
  echo.

  echo --- port 3000 ---
  netstat -ano | findstr ":3000" 2>&1
  echo.

  echo --- npm run setup ---
  call npm run setup 2>&1
  echo EXITCODE=%ERRORLEVEL%
  echo.

  echo --- short server start test ---
  start /b cmd /c "npm run dev > "%TEMP%\uno-dev.log" 2>&1"
  timeout /t 8 /nobreak >nul
  echo --- uno-dev.log ---
  type "%TEMP%\uno-dev.log" 2>&1
  echo.
  echo --- curl health ---
  curl -s http://localhost:3000/api/health 2>&1
  echo.
  taskkill /F /IM node.exe >nul 2>&1
) > "%OUT%" 2>&1

echo.
echo Done. Open this file and send me the text:
echo %OUT%
echo.
notepad "%OUT%"
pause
