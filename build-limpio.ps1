# Script de Build Limpio Completo
# Elimina todas las carpetas de build y caché, genera nuevo build y copia assets

Write-Host "=== BUILD LIMPIO COMPLETO ===" -ForegroundColor Cyan
Write-Host ""

# 1. Eliminar dist/
Write-Host "1. Eliminando dist/..." -ForegroundColor Yellow
Remove-Item -Path dist -Recurse -Force -ErrorAction SilentlyContinue
if ($?) { Write-Host "   ✓ dist/ eliminado" -ForegroundColor Green }

# 2. Eliminar assets/
Write-Host "2. Eliminando assets/..." -ForegroundColor Yellow
Remove-Item -Path assets -Recurse -Force -ErrorAction SilentlyContinue
if ($?) { Write-Host "   ✓ assets/ eliminado" -ForegroundColor Green }

# 3. Eliminar caché de Vite
Write-Host "3. Eliminando caché de Vite..." -ForegroundColor Yellow
Remove-Item -Path node_modules\.vite -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path .vite -Recurse -Force -ErrorAction SilentlyContinue
if ($?) { Write-Host "   ✓ Caché eliminado" -ForegroundColor Green }

# 4. Generar nuevo build
Write-Host "4. Generando nuevo build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Build generado exitosamente" -ForegroundColor Green
} else {
    Write-Host "   ✗ Error en el build" -ForegroundColor Red
    exit 1
}

# 5. Copiar assets
Write-Host "5. Copiando nuevos assets..." -ForegroundColor Yellow
if (Test-Path "dist\assets") {
    Copy-Item -Path dist\assets -Destination assets -Recurse -Force
    Write-Host "   ✓ assets/ copiado" -ForegroundColor Green
} else {
    Write-Host "   ✗ No se encontró dist\assets" -ForegroundColor Red
}

# 6. Copiar index.html
Write-Host "6. Copiando index.html..." -ForegroundColor Yellow
if (Test-Path "dist\index.html") {
    Copy-Item -Path dist\index.html -Destination index.html -Force
    Write-Host "   ✓ index.html copiado" -ForegroundColor Green
} else {
    Write-Host "   ✗ No se encontró dist\index.html" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== BUILD LIMPIO COMPLETADO ===" -ForegroundColor Green
Write-Host "✓ dist/ eliminado y regenerado" -ForegroundColor Green
Write-Host "✓ assets/ actualizado" -ForegroundColor Green
Write-Host "✓ index.html actualizado" -ForegroundColor Green
Write-Host "✓ Caché de Vite limpiado" -ForegroundColor Green
