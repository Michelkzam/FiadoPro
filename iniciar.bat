@echo off
title FiadoPro WhatsApp Bot
color 0A

cd /d "%~dp0server"

if not exist node_modules (
    echo Instalando dependencias...
    call npm install --silent
)

start "" /B node index.js
timeout /t 2 /nobreak >nul
start http://localhost:3001
