# 🔧 Solución: Error auth/unauthorized-domain

## ❌ Problema
Cuando intentas iniciar sesión con Google, aparece el error:
```
Firebase: Error (auth/unauthorized-domain)
```

Esto significa que el dominio `sortia.eu` no está autorizado en Firebase Authentication.

## ✅ Solución: Agregar Dominio Autorizado

### Paso 1: Ir a Firebase Console
1. Ve a: https://console.firebase.google.com/project/apuesta-7c52d/authentication
2. Haz clic en la pestaña **Sign-in method** (Métodos de inicio de sesión)

### Paso 2: Configurar Google Auth
1. Busca el proveedor **Google** en la lista
2. Haz clic en **Google**
3. Asegúrate de que el toggle esté **activado** (ON)
4. Si no está activado, actívalo y guarda

### Paso 3: Agregar Dominios Autorizados
1. En la misma página de configuración de Google, busca la sección **"Dominios autorizados"** o **"Authorized domains"**
2. Haz clic en **"Agregar dominio"** o **"Add domain"**
3. Agrega los siguientes dominios:
   - `sortia.eu` (tu dominio de producción)
   - `www.sortia.eu` (con www, si lo usas)
   - `localhost` (para desarrollo local - ya debería estar)

### Paso 4: Guardar y Esperar
1. Haz clic en **Guardar** o **Save**
2. Espera unos minutos (puede tardar hasta 5 minutos en propagarse)

## 📋 Lista de Dominios que Debes Tener

Asegúrate de tener estos dominios autorizados:
- ✅ `localhost` (para desarrollo)
- ✅ `sortia.eu` (tu dominio principal)
- ✅ `www.sortia.eu` (si usas www)

## 🔍 Verificar Configuración

Después de agregar el dominio:
1. Espera 2-5 minutos
2. Recarga la página en `sortia.eu`
3. Intenta iniciar sesión con Google nuevamente
4. El error debería desaparecer

## ⚠️ Nota Importante

- Los cambios pueden tardar unos minutos en aplicarse
- Si el error persiste después de 10 minutos, verifica que:
  - El dominio esté escrito correctamente (sin `http://` o `https://`)
  - No haya espacios extra
  - El dominio sea exactamente `sortia.eu` (minúsculas)

## 🎯 Ubicación Exacta en Firebase Console

1. Firebase Console → Tu Proyecto (`apuesta-7c52d`)
2. Authentication → Sign-in method
3. Google → Dominios autorizados (Authorized domains)
4. Agregar dominio → `sortia.eu` → Guardar

## ✅ Después de Configurar

Una vez agregado el dominio:
- El login con Google funcionará en `sortia.eu`
- Los usuarios podrán autenticarse con sus cuentas de Google
- Se crearán automáticamente usuarios con tipo `SOLO_VISUALIZAR`
