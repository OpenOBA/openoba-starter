@echo off
chcp 65001 >nul
title OpenOBA Starter

echo   ============================================
echo     OpenOBA Starter v1.0.0
echo     AI Executive Officer
echo   ============================================
echo.

echo   [1/2] Starting backend :3400 ...
start "OpenOBA Backend" cmd /c "cd /d %~dp0packages\backend && node dist/main.js"

echo   Waiting for backend to be ready...
set /a retry=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a retry+=1
curl -s -o NUL -w "%%{http_code}" http://localhost:3400/health 2>nul | findstr "200" >nul
if %errorlevel% equ 0 goto backend_ready
if %retry% geq 30 (
  echo   [WARN] Backend did not respond within 30s, starting frontend anyway...
  goto start_frontend
)
echo   . (retry %retry%/30)
goto wait_backend

:backend_ready
echo   Backend is ready (took %retry%s)

:start_frontend
echo   [2/2] Starting frontend :5173 ...
start "OpenOBA Frontend" cmd /c "cd /d %~dp0frontend && npx vite --host 0.0.0.0"

echo   Waiting for frontend to be ready...
set /a fretry=0
:wait_frontend
timeout /t 1 /nobreak >nul
set /a fretry+=1
curl -s -o NUL -w "%%{http_code}" http://localhost:5173 2>nul | findstr "200" >nul
if %errorlevel% equ 0 goto frontend_ready
if %fretry% geq 20 (
  echo   [WARN] Frontend did not respond within 20s, opening browser anyway...
  goto open_browser
)
goto wait_frontend

:frontend_ready
echo   Frontend is ready (took %fretry%s)

:open_browser
echo   Opening browser...
start http://localhost:5173

echo.
echo   ============================================
echo   OpenOBA Starter is running
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3400
echo.
echo   Close this window to stop all services
echo   ============================================
pause
