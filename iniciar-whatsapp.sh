#!/bin/bash
echo ""
echo "========================================"
echo "  FiadoPro WhatsApp Bot (100% Gratuito)"
echo "========================================"
echo ""
echo "Iniciando servidor..."
echo ""

cd "$(dirname "$0")/server"

if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
    echo ""
fi

echo "Iniciando bot..."
echo "Quando conectar, acesse http://localhost:3001"
echo ""
node index.js
