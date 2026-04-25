@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "STOP_FLAG=%~dp0tmp\server-control\stop.flag"

title Tile & Bath Plus Server
color 0A

if not exist "%NODE_EXE%" (
  echo Node.js executable was not found.
  echo %NODE_EXE%
  echo.
  pause
  exit /b 1
)

echo Tile and Bath Plus server manager
echo Keep this window open to keep the server running.
echo.

if exist "%STOP_FLAG%" del /f /q "%STOP_FLAG%" > nul 2>&1

:run
echo [%date% %time%] Starting server...
"%NODE_EXE%" server.js
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo [%date% %time%] Server stopped. Exit code: %EXIT_CODE%

if exist "%STOP_FLAG%" (
  del /f /q "%STOP_FLAG%" > nul 2>&1
  echo Stop flag detected. Closing manager window.
  exit /b 0
)

echo Restarting in 2 seconds. Close this window to stop the server manager.
timeout /t 2 /nobreak > nul
goto run
