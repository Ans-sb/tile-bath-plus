@echo off
setlocal

cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "APP_HOST="
set "APP_URL="

echo Starting Tile and Bath Plus...
echo.

if not exist "%NODE_EXE%" (
  echo Node.js executable was not found.
  echo %NODE_EXE%
  echo.
  echo Install Node.js and try again.
  pause
  exit /b 1
)

for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
  if not defined APP_HOST (
    set "APP_HOST=%%A"
  )
)

if defined APP_HOST (
  set "APP_HOST=%APP_HOST: =%"
)

if not defined APP_HOST (
  set "APP_HOST=127.0.0.1"
)

set "APP_URL=http://%APP_HOST%:4173/"

start "TileBathPlusServer" "%~dp0run-server.bat"

echo Starting server...
timeout /t 3 /nobreak > nul

start "" "%APP_URL%"

echo.
echo App URL: %APP_URL%
echo Keep the server window open.
echo Closing the server window will stop the local connection.
echo.
pause
