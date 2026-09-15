@echo off
title FiadoPro - Setup Android
color 0A

echo.
echo ========================================
echo   FiadoPro - Setup Android
echo ========================================
echo.

echo Verificando se PowerShell esta disponivel...
powershell -ExecutionPolicy Bypass -File "%~dp0setup-android.ps1"

echo.
echo ========================================
echo   Script finalizado!
echo ========================================
echo.
pause
