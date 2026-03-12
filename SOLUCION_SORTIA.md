# Solución para Sortia.eu - Archivos en la Raíz

## ✅ Problema Resuelto

He copiado los archivos compilados directamente a la raíz del repositorio, igual que en tus otros proyectos que funcionan.

## 📁 Estructura Actual en la Raíz

```
/
├── index.html          ← Archivo compilado (listo para ejecutar)
├── assets/             ← Archivos JS/CSS compilados
│   ├── index-TuDGdSmL.js
│   ├── react-vendor-DWqts4E_.js
│   ├── firebase-vendor-CeeyR_Jt.js
│   └── index-mCahNDiY.css
├── vite.svg           ← Icono
├── .htaccess          ← Configuración Apache
└── ... otros archivos fuente
```

## 🔄 Para Futuros Cambios

Cuando hagas cambios y quieras actualizar:

### Opción 1: Script Automático (Windows)
```bash
deploy-to-root.bat
```
Luego:
```bash
git add .
git commit -m "Actualizar archivos compilados"
git push origin main
```

### Opción 2: Manual
```bash
npm run build
# Copiar manualmente:
# - dist/index.html → index.html
# - dist/assets/ → assets/
# - dist/vite.svg → vite.svg
```

## 🎯 Cómo Funciona Ahora

1. **Tu webhook de Sortia.eu** descarga el repositorio
2. **Los archivos compilados** están en la raíz
3. **Sortia.eu** mapea la raíz a `public_html/`
4. **El servidor ejecuta** `index.html` que está en la raíz
5. **Todo funciona** ✅

## 🔍 Verificación

Después de que tu webhook descargue los cambios:

1. Ve a tu página en Sortia.eu
2. Deberías ver la aplicación funcionando
3. Si aún está en blanco, abre la consola del navegador (F12) y revisa errores

## ⚠️ Notas Importantes

- **NO borres** la carpeta `dist/` - se regenera con cada build
- **NO subas** `node_modules/` - está en `.gitignore`
- **SÍ sube** `index.html`, `assets/`, `vite.svg` y `.htaccess` en la raíz
- Los archivos fuente (`src/`) también están en el repo pero no se ejecutan

## 🐛 Si Sigue Sin Funcionar

1. **Verifica que `index.html` esté en la raíz** del repositorio
2. **Verifica que la carpeta `assets/` esté presente**
3. **Abre la consola del navegador (F12)** y revisa errores
4. **Verifica las rutas** - los archivos deben estar en `/assets/...` no en `/dist/assets/...`

## 📝 Comparación con Tus Otros Proyectos

Tus otros proyectos (antheacapital, etc.) tienen la misma estructura:
- `index.html` en la raíz
- `assets/` en la raíz
- Archivos compilados listos para ejecutar

Ahora este proyecto tiene la misma estructura ✅
