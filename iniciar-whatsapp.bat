@echo off
title FiadoPro WhatsApp Bot
color 0A

echo.
echo ========================================
echo   FiadoPro WhatsApp Bot (100% Gratuito)
echo ========================================
echo.

cd /d "%~dp0server"

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instale: https://nodejs.org/
    pause
    exit /b 1
)
echo OK
echo.

echo [2/3] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo ERRO ao instalar dependencias!
        pause
        exit /b 1
    )
)
echo OK
echo.

echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo   Porta: 3001
echo   URL: http://localhost:3001
echo ========================================
echo.
echo Aguarde o QR Code para conectar o WhatsApp
echo Para parar: Ctrl+C
echo.

node index.js
