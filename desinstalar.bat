@echo off
title FiadoPro - Remover Inicio Automatico
color 0C

echo.
echo ========================================
echo   FiadoPro - Remover Inicio Automatico
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

echo Removendo tarefa agendada...
schtasks /delete /tn "FiadoPro WhatsApp Bot" /f >nul 2>&1

echo Removendo da pasta Startup...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\FiadoPro WhatsApp.bat" >nul 2>&1

echo.
echo ========================================
echo   REMOVIDO COM SUCESSO!
echo ========================================
echo.
echo   O servidor nao mais inicia automaticamente.
echo   Para iniciar manualmente, execute iniciar.bat
echo ========================================
echo.
pause
