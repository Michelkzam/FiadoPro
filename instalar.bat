@echo off
title FiadoPro - Instalacao Automatica
color 0B

echo.
echo ========================================
echo   FiadoPro - Instalar Inicio Automatico
echo ========================================
echo.

cd /d "%~dp0"

:: Verificar se esta rodando como administrador
net session >nul 2>&1
if errorlevel 1 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/3] Criando tarefa agendada no Windows...
echo.

schtasks /delete /tn "FiadoPro WhatsApp Bot" /f >nul 2>&1

:: Criar tarefa para iniciar com o Windows
schtasks /create /tn "FiadoPro WhatsApp Bot" /tr "\"%~dp0iniciar.bat\"" /sc onlogon /rl highest /f

if errorlevel 1 (
    copy "%~dp0iniciar.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\FiadoPro WhatsApp.bat" >nul 2>&1
    if errorlevel 1 (
        echo ERRO ao instalar! Execute como administrador.
        pause
        exit /b 1
    )
    echo Instalado na pasta Startup!
) else (
    echo Tarefa agendada criada com sucesso!
)

echo.
echo [2/3] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias...
    call npm install --silent
)

echo.
echo [3/3] Iniciando FiadoPro...
start http://localhost:5173
start cmd /c "npm run dev"

echo.
echo ========================================
echo   INSTALADO COM SUCESSO!
echo ========================================
echo.
echo   O FiadoPro agora inicia automaticamente
echo   com o Windows. O QR Code vai aparecer
echo   no navegador automaticamente.
echo.
echo   Para REMOVER: execute desinstalar.bat
echo ========================================
echo.

timeout /t 5 /nobreak >nul
