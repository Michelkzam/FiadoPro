@echo off
title FiadoPro WhatsApp Bot
color 0A

echo.
echo ========================================
echo   FiadoPro WhatsApp Bot
echo ========================================
echo.

cd /d "%~dp0server"

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instale em: https://nodejs.org/
    pause
    exit /b 1
)
echo OK
echo.

echo [2/4] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias (pode demorar na 1a vez)...
    call npm install --silent
    if errorlevel 1 (
        echo ERRO ao instalar dependencias!
        pause
        exit /b 1
    )
)
echo OK
echo.

echo [3/4] Iniciando servidor na porta 3001...
start "" /B node index.js

echo [4/4] Aguardando servidor iniciar...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Servidor rodando!
echo   Acesse: http://localhost:3001
echo ========================================
echo.
echo Abrindo navegador...
start http://localhost:3001

echo.
echo ========================================
echo   ESCANEIE O QR CODE COM O WHATSAPP
echo   Menu > Dispositivos conectados > Conectar
echo ========================================
echo.
echo Para parar o servidor, feche esta janela.
echo.

pause
