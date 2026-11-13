@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem serve.py = collector + server in one. If it is already running, the second copy exits by itself.
start "" pythonw serve.py
ping -n 4 127.0.0.1 >nul
start "" http://127.0.0.1:8797/
