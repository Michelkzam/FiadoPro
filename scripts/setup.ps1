$ErrorActionPreference = "Stop"
$projectDir = "C:\Projetos\FiadoPro"

Write-Host ""
Write-Host "========================================"
Write-Host "  FiadoPro - Instalador Completo"
Write-Host "========================================"
Write-Host ""

# PASSO 1: Verificar Node.js
Write-Host "[1/8] Verificando Node.js..." -ForegroundColor Yellow

$nodeInstalled = $false
try {
    $nodeVersion = & node --version 2>&1
    if ($nodeVersion -match "v\d+") {
        Write-Host "  Node.js $nodeVersion encontrado" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {
    Write-Host "  Node.js nao encontrado" -ForegroundColor Red
}

if (-not $nodeInstalled) {
    Write-Host "  Instale o Node.js 18+ manualmente:" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org/" -ForegroundColor White
    exit 1
}

# PASSO 2: Verificar Java JDK (para Android)
Write-Host ""
Write-Host "[2/8] Verificando Java JDK (Android)..." -ForegroundColor Yellow

$javaInstalled = $false
try {
    $javaVersion = & java -version 2>&1 | Select-String "version"
    if ($javaVersion) {
        Write-Host "  Java encontrado" -ForegroundColor Green
        $javaInstalled = $true
    }
} catch {
    Write-Host "  Java nao encontrado (opcional para Android)" -ForegroundColor DarkYellow
}

# PASSO 3: Verificar Android SDK (opcional)
Write-Host ""
Write-Host "[3/8] Verificando Android SDK (opcional)..." -ForegroundColor Yellow

$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidSdkPath) {
    Write-Host "  Android SDK encontrado" -ForegroundColor Green
} else {
    Write-Host "  Android SDK nao encontrado (opcional para Android)" -ForegroundColor DarkYellow
}

# PASSO 4: Instalar dependencias
Write-Host ""
Write-Host "[4/8] Instalando dependencias..." -ForegroundColor Yellow

Set-Location $projectDir

if (-not (Test-Path "node_modules")) {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erro ao instalar dependencias" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "  Dependencias ja instaladas" -ForegroundColor Green
}

# PASSO 5: Instalar dependencias do server
Write-Host ""
Write-Host "[5/8] Instalando dependencias do server..." -ForegroundColor Yellow

$serverDir = "$projectDir\server"
if (-not (Test-Path "$serverDir\node_modules")) {
    Set-Location $serverDir
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erro ao instalar dependencias do server" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Dependencias do server instaladas" -ForegroundColor Green
} else {
    Write-Host "  Dependencias do server ja instaladas" -ForegroundColor Green
}

Set-Location $projectDir

# PASSO 6: Configurar .env
Write-Host ""
Write-Host "[6/8] Configurando variaveis de ambiente..." -ForegroundColor Yellow

$envPath = "$projectDir\.env"
$envExamplePath = "$projectDir\.env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item -Path $envExamplePath -Destination $envPath -Force
        Write-Host "  Arquivo .env criado a partir do .env.example" -ForegroundColor Green
        Write-Host "  IMPORTANTE: Edite o arquivo .env com suas credenciais!" -ForegroundColor Yellow
    } else {
        Write-Host "  Arquivo .env.example nao encontrado" -ForegroundColor Red
    }
} else {
    Write-Host "  Arquivo .env ja existe" -ForegroundColor Green
}

# PASSO 7: Gerar Webhook Secret
Write-Host ""
Write-Host "[7/8] Verificando Webhook Secret..." -ForegroundColor Yellow

$envContent = Get-Content $envPath -ErrorAction SilentlyContinue
if ($envContent -match "WEBHOOK_SECRET=$" -or $envContent -match "WEBHOOK_SECRET=\s*$") {
    $webhookSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $envContent = $envContent -replace "WEBHOOK_SECRET=$", "WEBHOOK_SECRET=$webhookSecret"
    $envContent | Set-Content $envPath -Encoding UTF8
    Write-Host "  Webhook Secret gerado automaticamente" -ForegroundColor Green
} else {
    Write-Host "  Webhook Secret ja configurado" -ForegroundColor Green
}

# PASSO 8: Build
Write-Host ""
Write-Host "[8/8] Build de producao..." -ForegroundColor Yellow

& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Erro no build" -ForegroundColor Red
    exit 1
}
Write-Host "  Build concluido" -ForegroundColor Green

# Verificar se keystore existe
$keystorePath = "$projectDir\android\app\fiadopro-release.keystore"
if (Test-Path $keystorePath) {
    Write-Host ""
    Write-Host "  Keystore encontrado" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  Keystore NAO encontrado - necessario para APK" -ForegroundColor Yellow
    Write-Host "  Execute: .\scripts\generate-keystore.bat" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Instalacao concluida!"
Write-Host "========================================"
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Edite o arquivo .env com suas credenciais do Supabase"
Write-Host "  2. Execute as migrations no Supabase SQL Editor"
Write-Host "  3. Para iniciar: npm run dev"
Write-Host "  4. Para Android: .\scripts\setup-android.bat"
Write-Host ""
Write-Host "Variaveis obrigatorias no .env:" -ForegroundColor Yellow
Write-Host "  - VITE_SUPABASE_URL (URL do projeto Supabase)"
Write-Host "  - VITE_SUPABASE_ANON_KEY (chave publica do Supabase)"
Write-Host "  - SUPABASE_URL (URL do projeto Supabase)"
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY (chave de servico do Supabase)"
Write-Host "  - WEBHOOK_SECRET (gerado automaticamente)"
Write-Host ""
