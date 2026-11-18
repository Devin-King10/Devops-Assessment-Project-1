@echo off
title Smart Warehouse - Backend
cd /d "%~dp0backend"
echo Starting Django backend on http://127.0.0.1:8000 ...
venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
pause
