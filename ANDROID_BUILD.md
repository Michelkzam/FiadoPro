# FiadoPro - Build Android

## Pré-requisitos

1. **Android Studio** - https://developer.android.com/studio
2. **Java JDK 17+** - https://adoptium.net/
3. **Node.js 18+**

## Setup Inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Gerar keystore (primeira vez)

```bash
# Windows
scripts\generate-keystore.bat

# Linux/Mac
./scripts/generate-keystore.sh
```

Ou manualmente:

```bash
keytool -genkey -v \
  -keystore fiadopro-release.keystore \
  -alias fiadopro \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 3. Configurar signing

Edite `android/key.properties`:

```properties
storePassword=SUA_SENHA
keyPassword=SUA_SENHA
keyAlias=fiadopro
storeFile=fiadopro-release.keystore
```

### 4. Mover keystore

```bash
mv fiadopro-release.keystore android/app/
```

## Build

### Build completo (recomendado)

```bash
npm run cap:build
```

Este comando:
1. Builda o React (vite build)
2. Sincroniza com o projeto Android
3. Copia assets para o projeto nativo

### Abrir no Android Studio

```bash
npm run cap:open
```

### Build via Android Studio

1. Abra o Android Studio
2. File > Open > selecione a pasta `android/`
3. Aguarde o Gradle sync
4. Build > Build Bundle(s) / APK(s) > Build APK(s)

### Build via CLI

```bash
cd android
./gradlew assembleRelease
```

O APK será gerado em:
`android/app/build/outputs/apk/release/app-release.apk`

## Push Notifications

Para Push Notifications funcionarem, você precisa:

1. Criar projeto no Firebase Console
2. Baixar `google-services.json`
3. Colocar em `android/app/`
4. Rebuildar o app

## Debug

### Build de debug

```bash
cd android
./gradlew assembleDebug
```

### Instalar em dispositivo

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Logs

```bash
adb logcat | grep -i fiadopro
```

## Troubleshooting

### Erro: "Could not find method android()"

Execute:
```bash
cd android
./gradlew clean
```

### Erro: "SDK not found"

Abra o Android Studio e instale o SDK via:
Tools > SDK Manager

### Erro: "Keystore not found"

Verifique se o arquivo `android/key.properties` está correto e se o keystore existe em `android/app/`.
