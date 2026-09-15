@echo off
title FiadoPro - Instalacao Automatica
color 0B

echo.
echo ========================================
echo   FiadoPro - Instalar Inicio Automatico
echo ========================================
echo.
echo  Este assistente faz o servidor WhatsApp
echo  iniciar automaticamente quando o Windows
echo  inicia. Basta configurar UMA VEZ.
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

:: Remover tarefa antiga se existir
schtasks /delete /tn "FiadoPro WhatsApp Bot" /f >nul 2>&1

:: Criar tarefa para iniciar com o Windows
schtasks /create /tn "FiadoPro WhatsApp Bot" /tr "\"%~dp0iniciar.bat\"" /sc onlogon /rl highest /f

if errorlevel 1 (
    echo ERRO ao criar tarefa agendada!
    echo.
    echo Tentando metodo alternativo...
    echo.

    :: Metodo alternativo: copiar para pasta Startup
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
echo [2/3] Verificando se o servidor ja esta rodando...
tasklist /FI "WINDOWTITLE eq FiadoPro WhatsApp Bot" 2>nul | find /I "node.exe" >nul 2>&1
if not errorlevel 1 (
    echo Servidor ja esta rodando!
) else (
    echo Iniciando servidor agora...
    start "" /B cmd /c "cd /d \"%~dp0server\" && node index.js"
    timeout /t 3 /nobreak >nul
)

echo.
echo [3/3] Abrindo navegador...
start http://localhost:3001

echo.
echo ========================================
echo   INSTALADO COM SUCESSO!
echo ========================================
echo.
echo   O servidor WhatsApp agora inicia
echo   automaticamente com o Windows.
echo.
echo   Nao e mais necessario clicar em
echo   nenhum botao. Tudo automatico!
echo.
echo   Para REMOVER: execute desinstalar.bat
echo ========================================
echo.

:: Abrir a aba WhatsApp no navegador
start http://localhost:3001

pause
