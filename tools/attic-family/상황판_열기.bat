@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "attic-family-collector" /min python collect.py
start "attic-family-server" /min python -m http.server 8797 --bind 127.0.0.1
ping -n 4 127.0.0.1 >nul
start "" http://127.0.0.1:8797/
echo.
echo  Attic family board is open: http://127.0.0.1:8797/
echo  To stop: close the two minimized windows (collector, server).
ping -n 6 127.0.0.1 >nul
