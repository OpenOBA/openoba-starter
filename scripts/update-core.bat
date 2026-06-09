@echo off
REM OpenOBA Starter — Core Update Script
REM Usage: run from openoba-starter root: scripts\update-core.bat

echo ============================================
echo   OpenOBA Core Engine Update
echo ============================================
echo.

set ROOT=%~dp0..

echo [1/5] Building Core from source...
cd /d %ROOT%\..\openoba-core\backend
call npx nest build
if errorlevel 1 (
  echo ERROR: Core build failed
  pause
  exit /b 1
)

echo [2/5] Copying Core dist to packages/core/dist...
robocopy dist %ROOT%\packages\core\dist /MIR /NFL /NDL
if errorlevel 8 (
  echo ERROR: Copy failed
  pause
  exit /b 1
)

echo [3/5] Packing Core...
cd /d %ROOT%\packages\core
call npm pack
move openoba-core-*.tgz %ROOT%\ >nul 2>&1

echo [4/5] Installing...
cd /d %ROOT%
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)

echo [5/5] Rebuilding backend...
call npm run build:backend
if errorlevel 1 (
  echo ERROR: Backend build failed
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Core update complete.
echo   Restart the backend to apply changes.
echo ============================================
pause
