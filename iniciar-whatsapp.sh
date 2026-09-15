#!/bin/bash
echo ""
echo "========================================"
echo "  FiadoPro WhatsApp Bot (100% Gratuito)"
echo "========================================"
echo ""

cd "$(dirname "$0")/server"

echo "[1/3] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js nao encontrado!"
    echo "Instale: https://nodejs.org/"
    exit 1
fi
echo "OK"
echo ""

echo "[2/3] Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERRO ao instalar dependencias!"
        exit 1
    fi
fi
echo "OK"
echo ""

echo "[3/3] Iniciando servidor..."
echo ""
echo "========================================"
echo "  Porta: 3001"
echo "  URL: http://localhost:3001"
echo "========================================"
echo ""
echo "Aguarde o QR Code para conectar o WhatsApp"
echo "Para parar: Ctrl+C"
echo ""

node index.js
