@echo off
title FiadoPro WhatsApp Bot
echo.
echo ========================================
echo   FiadoPro WhatsApp Bot (100% Gratuito)
echo ========================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0server"

if not exist node_modules (
    echo Instalando dependencias...
    call npm install
    echo.
)

echo Iniciando bot...
echo Quando conectar, acesse http://localhost:3001
echo.
node index.js

pause
