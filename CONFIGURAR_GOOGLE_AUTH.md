# Configurar Autenticación con Google

## Pasos para Habilitar Login con Google

### 1. Habilitar Google Auth en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/project/apuesta-7c52d/authentication)
2. Si es la primera vez, haz clic en **Empezar**
3. Ve a la pestaña **Sign-in method**
4. Haz clic en **Google**
5. Activa el proveedor (toggle ON)
6. Ingresa el **email de soporte del proyecto** (puede ser tu email)
7. Haz clic en **Guardar**

### 2. Configurar Dominios Autorizados

1. En la misma página de Sign-in method > Google
2. Haz clic en **Dominios autorizados**
3. Agrega tu dominio:
   - `sortia.eu`
   - `localhost` (para desarrollo)

### 3. Actualizar Reglas de Firestore

Copia las reglas de `REGLAS_FIRESTORE_CORREGIDAS.md` y pégalas en Firebase Console > Firestore > Reglas.

## ✅ Listo

Después de configurar:
- Los usuarios pueden registrarse con email/contraseña
- Los usuarios pueden iniciar sesión con Google
- El nombre puede ser diferente al username
- Los usuarios nuevos tienen tipo `SOLO_VISUALIZAR` por defecto
