@echo off
title FiadoPro - Instalador Completo
color 0A

echo.
echo ========================================
echo   FiadoPro - Instalador Completo
echo ========================================
echo.

echo Verificando se PowerShell esta disponivel...
powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

echo.
echo ========================================
echo   Instalador finalizado!
echo ========================================
echo.
pause
