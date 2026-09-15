@echo off
title FiadoPro WhatsApp Bot
color 0A

cd /d "%~dp0"

if not exist node_modules (
    echo Instalando dependencias...
    call npm install --silent
)

echo Iniciando FiadoPro...
echo O QR Code vai aparecer no navegador automaticamente.
echo.

start http://localhost:5173
npm run dev
