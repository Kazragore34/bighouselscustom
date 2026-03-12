# Configuración para Sortia.eu - Estructura Public HTML

## Estructura del Servidor

Tu servidor tiene esta estructura:
```
home/
└── public_html/  ← Todo lo que está en Git va aquí
    └── index.html ← El servidor ejecuta este archivo
```

## Solución: GitHub Actions Automático

He configurado GitHub Actions para que automáticamente:

1. **Compile el proyecto** cuando hagas push
2. **Copie los archivos compilados** de `dist/` a la raíz del repositorio
3. **Haga commit y push** de los archivos compilados

Así, cuando tu webhook descargue el repositorio, tendrá los archivos compilados listos.

## Configuración de Secrets en GitHub (Opcional pero Recomendado)

Si quieres que las variables de entorno se configuren automáticamente:

1. Ve a tu repositorio en GitHub
2. Settings > Secrets and variables > Actions
3. Agrega estos secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

Si no los configuras, el workflow usará los valores del archivo `.env` que ya está en el repo.

## Cómo Funciona

1. **Haces cambios** en el código
2. **Haces commit y push** a GitHub
3. **GitHub Actions se ejecuta automáticamente**:
   - Instala dependencias
   - Compila el proyecto (`npm run build`)
   - Copia archivos de `dist/` a la raíz
   - Hace commit de los archivos compilados
4. **Tu webhook descarga** el repositorio actualizado
5. **Los archivos compilados** están en `public_html/` listos para servir

## Verificación

Después de hacer push, verifica:

1. Ve a la pestaña **Actions** en GitHub
2. Deberías ver el workflow ejecutándose
3. Cuando termine, verifica que los archivos compilados estén en la raíz del repo
4. Tu webhook debería descargar los archivos actualizados

## Estructura Final en el Repositorio

Después del build automático, tu repo tendrá:

```
/
├── index.html          ← Archivo compilado (desde dist/)
├── assets/            ← Archivos JS/CSS compilados
│   ├── index-XXXXX.js
│   └── index-XXXXX.css
├── .htaccess          ← Configuración Apache
├── vite.svg           ← Icono
├── src/               ← Código fuente (se mantiene)
├── package.json       ← Configuración
└── ... otros archivos
```

## Solución Manual (Si GitHub Actions no funciona)

Si prefieres hacerlo manualmente:

1. **Compila localmente:**
   ```bash
   npm run build
   ```

2. **Copia archivos de dist a la raíz:**
   ```bash
   cp -r dist/* .
   cp dist/.htaccess . 2>/dev/null || true
   ```

3. **Haz commit y push:**
   ```bash
   git add .
   git commit -m "Deploy compiled files"
   git push origin main
   ```

## Troubleshooting

### Los archivos no se compilan automáticamente
- Verifica que el workflow esté en `.github/workflows/deploy.yml`
- Revisa la pestaña Actions en GitHub para ver errores

### La página sigue en blanco
- Verifica que `index.html` esté en la raíz del repo
- Verifica que la carpeta `assets/` esté presente
- Abre la consola del navegador (F12) para ver errores

### Variables de entorno no funcionan
- Configura los secrets en GitHub (recomendado)
- O asegúrate de que `.env` esté en el repo (menos seguro)

## Nota Importante

El workflow hace commit automático de los archivos compilados. Esto es normal y necesario para que tu webhook tenga los archivos listos.

Si quieres evitar commits automáticos, puedes modificar el workflow para que solo prepare los archivos sin hacer commit.
