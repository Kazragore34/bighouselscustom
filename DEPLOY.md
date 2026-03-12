# Guía de Despliegue (Deploy)

## ⚠️ Problema Actual

Si no ves nada en tu página, es porque estás subiendo el **código fuente** en lugar de los **archivos compilados**.

## ✅ Solución

### Opción 1: Build Manual (Recomendado para empezar)

1. **Compilar el proyecto:**
   ```bash
   npm run build
   ```

2. **Subir la carpeta `dist/` a tu servidor:**
   - La carpeta `dist/` contiene todos los archivos compilados
   - Sube TODO el contenido de `dist/` a la raíz de tu servidor web
   - Asegúrate de que `index.html` esté en la raíz

3. **Verificar que funcione:**
   - Abre tu página web
   - Deberías ver la aplicación funcionando

### Opción 2: Automatizar con GitHub Actions

Si tu servidor tiene acceso por SSH o FTP, puedes automatizar el proceso:

1. **Crear secretos en GitHub:**
   - Ve a Settings > Secrets and variables > Actions
   - Agrega tus credenciales de servidor (SSH, FTP, etc.)

2. **Modificar `.github/workflows/deploy.yml`:**
   - Agrega los comandos para subir `dist/` a tu servidor
   - Ejemplo con SSH:
     ```yaml
     - name: Deploy to server
       uses: appleboy/scp-action@master
       with:
         host: ${{ secrets.HOST }}
         username: ${{ secrets.USERNAME }}
         key: ${{ secrets.SSH_KEY }}
         source: "dist/*"
         target: "/ruta/en/servidor"
     ```

### Opción 3: Usar Servicios de Hosting Automático

#### Vercel (Recomendado - Gratis)
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Configura:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. ¡Listo! Se despliega automáticamente

#### Netlify (Gratis)
1. Ve a [netlify.com](https://netlify.com)
2. Conecta tu repositorio
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. ¡Listo!

#### Firebase Hosting (Gratis)
1. Instala Firebase CLI: `npm install -g firebase-tools`
2. Inicializa: `firebase init hosting`
3. Configura:
   - Public directory: `dist`
   - Build command: `npm run build`
4. Despliega: `firebase deploy`

## 📁 Estructura de Archivos en Servidor

Tu servidor debe tener esta estructura:

```
/
├── index.html          (desde dist/index.html)
├── assets/
│   ├── index-XXXXX.js  (archivo JavaScript compilado)
│   └── index-XXXXX.css (archivo CSS compilado)
└── vite.svg
```

## 🔧 Configuración del Servidor

### Si usas Apache (.htaccess)
Crea un archivo `.htaccess` en la raíz:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Si usas Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 🐛 Solución de Problemas

### "Página en blanco"
- Verifica que subiste la carpeta `dist/` completa
- Verifica que `index.html` esté en la raíz
- Abre la consola del navegador (F12) y revisa errores

### "404 Not Found"
- Verifica la configuración de rutas del servidor
- Asegúrate de que todas las rutas redirijan a `index.html`

### "Variables de entorno no funcionan"
- Verifica que el archivo `.env` esté en el servidor (si es necesario)
- O configura las variables directamente en el servidor

## 📝 Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build para producción
npm run build

# Previsualizar build localmente
npm run preview

# Ver qué se generó
ls -la dist/
```

## ⚡ Build Rápido

Si solo quieres compilar y probar:

```bash
npm run build
npm run preview
```

Esto compila y abre un servidor local para probar el build.
