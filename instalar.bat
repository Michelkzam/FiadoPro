@echo off
title FiadoPro - Instalador
color 0A

echo.
echo ========================================
echo   FiadoPro - Instalador
echo ========================================
echo.
echo Opcoes:
echo   1. Instalacao completa (recomendado)
echo   2. Apenas dependencias
echo   3. Apenas build
echo   4. Configurar Android
echo   5. Gerar keystore
echo   6. Iniciar WhatsApp Bot
echo   7. Sair
echo.

set /p opcao="Escolha uma opcao (1-7): "

if "%opcao%"=="1" goto :completo
if "%opcao%"=="2" goto :deps
if "%opcao%"=="3" goto :build
if "%opcao%"=="4" goto :android
if "%opcao%"=="5" goto :keystore
if "%opcao%"=="6" goto :whatsapp
if "%opcao%"=="7" goto :sair

echo Opcao invalida!
pause
goto :eof

:completo
echo.
echo Executando instalacao completa...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
pause
goto :eof

:deps
echo.
echo Instalando dependencias...
echo.
call npm install
cd server
call npm install
cd ..
echo.
echo Dependencias instaladas!
pause
goto :eof

:build
echo.
echo Executando build...
echo.
call npm run build
echo.
echo Build concluido!
pause
goto :eof

:android
echo.
echo Configurando Android...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-android.ps1"
pause
goto :eof

:keystore
echo.
call "%~dp0scripts\generate-keystore.bat"
goto :eof

:whatsapp
echo.
call "%~dp0iniciar-whatsapp.bat"
goto :eof

:sair
echo.
echo Ate logo!
echo.
