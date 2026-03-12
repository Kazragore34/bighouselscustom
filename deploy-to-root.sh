#!/bin/bash
# Script para copiar archivos compilados a la raíz del repositorio
# Ejecutar: bash deploy-to-root.sh

echo "🔨 Compilando proyecto..."
npm run build

echo "📦 Copiando archivos de dist/ a la raíz..."
cp -r dist/* .
cp dist/.htaccess . 2>/dev/null || cp .htaccess . 2>/dev/null || true

echo "✅ Archivos copiados. Estructura actual:"
ls -la | grep -E "(index.html|assets|\.htaccess)"

echo ""
echo "📝 Ahora haz commit y push:"
echo "   git add ."
echo "   git commit -m 'Deploy compiled files'"
echo "   git push origin main"
