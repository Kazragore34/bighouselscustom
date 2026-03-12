# Configuración para Sortia.eu

## Problema: Página en Blanco

Si tu página en sortia.eu está en blanco, es porque necesitas:

1. **Compilar el proyecto** antes de subirlo
2. **Subir la carpeta `dist/`** en lugar del código fuente
3. **Configurar las rutas** correctamente

## Solución Paso a Paso

### Paso 1: Compilar el Proyecto

En tu máquina local, ejecuta:

```bash
npm run build
```

Esto crea la carpeta `dist/` con todos los archivos compilados.

### Paso 2: Subir a Sortia.eu

1. **Accede a tu panel de Sortia.eu**
2. **Sube SOLO el contenido de la carpeta `dist/`**:
   - `index.html` → raíz del servidor
   - `assets/` → carpeta `assets/` en el servidor
   - `vite.svg` → raíz del servidor

### Paso 3: Configurar el Servidor

Si Sortia.eu usa Apache, también sube el archivo `.htaccess` que está en el repositorio.

Si usa otro servidor, configura las rutas para que todas redirijan a `index.html` (necesario para React Router).

## Configuración del Webhook

Si tienes un webhook configurado, necesitas modificarlo para que:

1. **Clone el repositorio**
2. **Ejecute el build**:
   ```bash
   npm install
   npm run build
   ```
3. **Suba la carpeta `dist/`** al servidor

## Estructura en el Servidor

Tu servidor debe tener esta estructura:

```
/
├── index.html          ← Desde dist/index.html
├── .htaccess          ← Para Apache (opcional)
├── assets/
│   ├── index-XXXXX.js  ← Archivo JavaScript compilado
│   └── index-XXXXX.css ← Archivo CSS compilado
└── vite.svg           ← Desde dist/vite.svg
```

## Verificación

1. Abre tu página en sortia.eu
2. Abre la consola del navegador (F12)
3. Revisa si hay errores en la consola

### Errores Comunes

- **404 en archivos JS/CSS**: Verifica que la carpeta `assets/` esté en el lugar correcto
- **Página en blanco**: Verifica que `index.html` esté en la raíz
- **Rutas no funcionan**: Configura el servidor para redirigir todo a `index.html`

## Contacto con Sortia.eu

Si necesitas ayuda con la configuración del servidor, contacta al soporte de Sortia.eu y diles que necesitas:

- **SPA (Single Page Application)** configurada
- Todas las rutas deben redirigir a `index.html`
- Soporte para archivos estáticos en carpeta `assets/`

## Alternativa: Build Manual

Si el webhook no funciona:

1. Ejecuta `npm run build` localmente
2. Comprime la carpeta `dist/`
3. Súbela manualmente a Sortia.eu
4. Descomprime en la raíz del servidor
