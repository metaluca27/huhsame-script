@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" /b python -m http.server 8787 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8787/
echo.
echo  Luka AI Office is open: http://127.0.0.1:8787/
echo  Close this window to stop.
pause >nul
