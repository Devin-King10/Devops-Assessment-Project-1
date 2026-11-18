@echo off
title Smart Warehouse - Frontend
SET PATH=C:\Program Files\nodejs\New Folder;%PATH%
cd /d "%~dp0frontend"
echo Starting React frontend on http://localhost:3000 ...
npm.cmd run dev
pause
