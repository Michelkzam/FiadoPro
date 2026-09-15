$ErrorActionPreference = "Stop"
$projectDir = "C:\Projetos\FiadoPro"

Write-Host ""
Write-Host "========================================"
Write-Host "  FiadoPro - Setup Android"
Write-Host "========================================"
Write-Host ""

# PASSO 1: Verificar Java
Write-Host "[1/6] Verificando Java JDK..." -ForegroundColor Yellow

$javaInstalled = $false
try {
    $javaVersion = & java -version 2>&1 | Select-String "version"
    if ($javaVersion) {
        Write-Host "  Java encontrado" -ForegroundColor Green
        $javaInstalled = $true
    }
} catch {
    Write-Host "  Java nao encontrado" -ForegroundColor Red
}

if (-not $javaInstalled) {
    Write-Host "  Instale o Java JDK 17 manualmente:" -ForegroundColor Yellow
    Write-Host "  https://adoptium.net/temurin/releases/" -ForegroundColor White
    Write-Host "  Baixe OpenJDK 17 LTS Windows x64 .msi" -ForegroundColor White
    Write-Host "  Reinicie o PowerShell apos instalar" -ForegroundColor White
    exit 1
}

# PASSO 2: Verificar Android SDK
Write-Host ""
Write-Host "[2/6] Verificando Android SDK..." -ForegroundColor Yellow

$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidSdkPath) {
    Write-Host "  Android SDK encontrado" -ForegroundColor Green
} else {
    Write-Host "  Instale o Android Studio:" -ForegroundColor Yellow
    Write-Host "  https://developer.android.com/studio" -ForegroundColor White
    exit 1
}

# PASSO 3: Gerar Keystore
Write-Host ""
Write-Host "[3/6] Gerando keystore..." -ForegroundColor Yellow

$keystoreDest = "$projectDir\android\app\fiadopro-release.keystore"

if (Test-Path $keystoreDest) {
    Write-Host "  Keystore ja existe" -ForegroundColor Green
} else {
    $keystorePath = "$projectDir\fiadopro-release.keystore"
    
    if (Test-Path $keystorePath) {
        Remove-Item -Path $keystorePath -Force
    }
    
    & keytool -genkey -v -keystore $keystorePath -alias fiadopro -keyalg RSA -keysize 2048 -validity 10000 -storepass fiadopro123 -keypass fiadopro123 -dname "CN=FiadoPro, OU=Dev, O=FiadoPro, L=SP, ST=SP, C=BR"
    
    if (Test-Path $keystorePath) {
        Copy-Item -Path $keystorePath -Destination $keystoreDest -Force
        Write-Host "  Keystore gerado e copiado" -ForegroundColor Green
    } else {
        Write-Host "  Erro ao gerar keystore" -ForegroundColor Red
        exit 1
    }
}

# PASSO 4: Configurar key.properties
Write-Host ""
Write-Host "[4/6] Configurando key.properties..." -ForegroundColor Yellow

$keyPropsPath = "$projectDir\android\key.properties"
$keyPropsContent = "storePassword=fiadopro123`nkeyPassword=fiadopro123`nkeyAlias=fiadopro`nstoreFile=fiadopro-release.keystore"
Set-Content -Path $keyPropsPath -Value $keyPropsContent -Encoding UTF8
Write-Host "  key.properties atualizado" -ForegroundColor Green

# PASSO 5: Build + Sync
Write-Host ""
Write-Host "[5/6] Build React + Sync Android..." -ForegroundColor Yellow

Set-Location $projectDir
& npm run build
& npx cap sync android
Write-Host "  Build e sync concluidos" -ForegroundColor Green

# PASSO 6: Abrir Android Studio
Write-Host ""
Write-Host "[6/6] Abrindo Android Studio..." -ForegroundColor Yellow

$studioPath = "$env:LOCALAPPDATA\Programs\Android Studio\bin\studio64.exe"
if (Test-Path $studioPath) {
    Start-Process -FilePath $studioPath -ArgumentList "$projectDir\android"
    Write-Host "  Android Studio aberto" -ForegroundColor Green
} else {
    Write-Host "  Abra o Android Studio e abra a pasta: $projectDir\android" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Setup concluido!"
Write-Host "========================================"
Write-Host ""
Write-Host "Proximos passos no Android Studio:" -ForegroundColor Yellow
Write-Host "  1. Aguarde o Gradle sincronizar"
Write-Host "  2. Build > Build Bundle(s) / APK(s) > Build APK(s)"
Write-Host "  3. Clique em locate para ver o APK"
Write-Host ""
Write-Host "Para instalar no celular:" -ForegroundColor Yellow
Write-Host "  1. Conecte o celular via USB"
Write-Host "  2. Ative Modo Desenvolvedor (toque 7x no Numero da versao)"
Write-Host "  3. Ative Depuracao USB"
Write-Host "  4. Clique no botao Run no Android Studio"
Write-Host ""
Write-Host "Senha do keystore: fiadopro123" -ForegroundColor Cyan
Write-Host ""
