@echo off
echo ========================================
echo FiadoPro - Gerar Keystore para Android
echo ========================================
echo.
echo Este script vai gerar um keystore para assinar o APK.
echo.
echo IMPORTANTE: Anote a senha e o alias gerados!
echo.

set /p alias="Alias (padrao: fiadopro): "
if "%alias%"=="" set alias=fiadopro

set /p validity="Validade em dias (padrao: 10000): "
if "%validity%"=="" set validity=10000

echo.
echo Gerando keystore...
echo.

keytool -genkey -v ^
  -keystore fiadopro-release.keystore ^
  -alias %alias% ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity %validity%

if errorlevel 1 (
    echo.
    echo ERRO ao gerar keystore!
    echo Verifique se o Java JDK esta instalado.
    pause
    exit /b 1
)

echo.
echo Keystore gerado: fiadopro-release.keystore
echo.
echo PROXIMO PASSO:
echo 1. Mova o arquivo fiadopro-release.keystore para android/app/
echo 2. Atualize o arquivo android/key.properties com as senhas
echo 3. Execute: npm run cap:build
echo.

pause
