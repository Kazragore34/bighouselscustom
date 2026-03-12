# Configuración Completa de Firebase

## ✅ Credenciales Configuradas

Tu proyecto Firebase está configurado con:
- **Proyecto**: apuesta-7c52d
- **Project ID**: apuesta-7c52d

## 📝 Archivo .env

El archivo `.env` ya está creado con tus credenciales. Este archivo NO se sube a Git por seguridad.

## 🚀 Próximos Pasos

### 1. Verificar que el archivo .env existe
Asegúrate de que el archivo `.env` esté en la raíz del proyecto con tus credenciales.

### 2. Configurar Firestore Database

1. Ve a [Firebase Console](https://console.firebase.google.com/project/apuesta-7c52d)
2. En el menú lateral, ve a **Firestore Database**
3. Haz clic en **Crear base de datos**
4. Selecciona **Iniciar en modo de prueba**
5. Elige una ubicación (recomendado: us-central1 o la más cercana)

### 3. Configurar Reglas de Seguridad

En Firestore Database > Reglas, copia y pega estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function para verificar si es admin
    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Usuarios - Lectura para autenticados, escritura pública para registro
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if true; // Permite registro público
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // Eventos - Lectura para todos autenticados, escritura solo admin
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Votos - Lectura para todos, creación para autenticados con permisos
    match /votes/{voteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'SOLO_VISUALIZAR' &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'NO_PARTICIPA';
    }
    
    // Apuestas - Lectura para todos, creación para autenticados con permisos
    match /bets/{betId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'SOLO_VISUALIZAR' &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'NO_PARTICIPA';
      allow update: if isAdmin();
    }
    
    // Brackets - Lectura para todos, escritura solo admin
    match /brackets/{bracketId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Participantes de eventos - Lectura para todos, escritura solo admin
    match /eventParticipants/{participantId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

**Nota**: Estas reglas permiten registro público pero requieren autenticación para leer datos. Los usuarios con tipo `SOLO_VISUALIZAR` y `NO_PARTICIPA` no pueden crear votos ni apuestas.

### 4. Crear el Primer Usuario Admin

Después de configurar Firestore, necesitas crear el primer usuario admin:

**Opción A: Desde el código (temporal)**
1. Ejecuta `npm run dev`
2. Regístrate con una cuenta normal
3. Ve a Firebase Console > Firestore
4. Encuentra tu usuario en la colección `users`
5. Edita el documento y cambia `userType` a `"ADMIN"`

**Opción B: Directamente en Firestore**
1. Ve a Firebase Console > Firestore
2. Crea una nueva colección llamada `users`
3. Crea un documento con estos campos:
   ```json
   {
     "username": "admin",
     "password": "[hash bcrypt de tu contraseña]",
     "userType": "ADMIN",
     "email": "admin@example.com",
     "enabled": true,
     "photoURL": "",
     "badges": [],
     "createdAt": [timestamp actual]
   }
   ```

Para generar el hash de la contraseña, puedes usar un script temporal o una herramienta online de bcrypt.

### 5. Probar la Aplicación

```bash
npm run dev
```

La aplicación debería iniciar en `http://localhost:5173`

## 🔒 Seguridad

- El archivo `.env` está en `.gitignore` y NO se sube a Git
- Las contraseñas se almacenan hasheadas con bcryptjs
- Las reglas de Firestore protegen los datos

## 📚 Documentación Adicional

- `FIREBASE_SETUP.md` - Guía completa de configuración
- `SIN_STORAGE.md` - Cómo usar imágenes sin Storage
- `INSTRUCCIONES.md` - Guía de uso del sistema

## ⚠️ Notas Importantes

1. **Storage**: No está habilitado (plan gratuito). Usa URLs de Imgur/ImgBB o base64.
2. **Reglas de Firestore**: Asegúrate de configurarlas correctamente antes de usar la app.
3. **Primer Admin**: Debes crear manualmente el primer usuario admin.

## 🆘 Solución de Problemas

### Error: "Firebase: Error (auth/unauthorized)"
- Verifica que las reglas de Firestore estén configuradas
- Asegúrate de que el usuario esté autenticado

### Error: "Permission denied"
- Revisa las reglas de seguridad
- Verifica que el usuario tenga los permisos necesarios

### Las imágenes no cargan
- Si usas URLs, verifica que sean públicas
- Si usas base64, verifica que la imagen no sea muy grande
