# Reglas de Firestore Corregidas

## ⚠️ Problemas Solucionados

1. **Admin puede editar usuarios**: Los admins ahora pueden actualizar cualquier usuario
2. **Usuarios pueden leer su propio perfil**: Todos los usuarios autenticados pueden leer su propio perfil
3. **Usuarios pueden editar su propio perfil**: Los usuarios pueden actualizar su nombre, email y foto (pero no userType)

## ✅ Reglas Corregidas

Copia y pega estas reglas en Firebase Console > Firestore Database > Reglas:

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
    
    // Helper function para obtener el userType del usuario autenticado desde Firestore
    function getUserType() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType;
    }
    
    // Usuarios
    match /users/{userId} {
      // Permitir lectura: admin puede leer todos, usuarios pueden leer su propio perfil
      allow read: if request.auth != null && 
                     (isAdmin() || request.auth.uid == userId);
      
      // Permitir creación pública (registro)
      allow create: if true;
      
      // Permitir actualización:
      // - Admin puede actualizar cualquier usuario
      // - Usuario puede actualizar su propio perfil (pero no userType)
      allow update: if request.auth != null && (
        isAdmin() || 
        (request.auth.uid == userId && 
         !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userType', 'enabled']))
      );
      
      // Permitir eliminación solo a admin
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
                       exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                       getUserType() != 'SOLO_VISUALIZAR' &&
                       getUserType() != 'NO_PARTICIPA';
    }
    
    // Apuestas - Lectura para todos, creación para autenticados con permisos
    match /bets/{betId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                       getUserType() != 'SOLO_VISUALIZAR' &&
                       getUserType() != 'NO_PARTICIPA';
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

## 🔧 Alternativa Más Simple (Si la anterior no funciona)

Si las reglas anteriores son muy complejas, usa esta versión simplificada temporalmente:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir todo temporalmente para desarrollo (CAMBIA ESTO EN PRODUCCIÓN)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ IMPORTANTE**: Esta regla permite todo. Úsala solo para probar y luego cambia a las reglas más seguras de arriba.

## 📝 Pasos para Aplicar las Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/project/apuesta-7c52d/firestore)
2. Haz clic en la pestaña **Reglas**
3. Copia y pega las reglas de arriba
4. Haz clic en **Publicar**
5. Espera unos segundos a que se apliquen
6. Prueba editar un usuario desde el panel admin

## 🎯 Cambios Importantes

- ✅ Admin puede actualizar cualquier campo de cualquier usuario
- ✅ Usuarios pueden leer su propio perfil
- ✅ Usuarios pueden actualizar su nombre, email y foto (pero NO userType ni enabled)
- ✅ Los usuarios SOLO_VISUALIZAR pueden editar su perfil

## ✅ Después de Configurar

- El admin podrá editar usuarios sin errores de permisos
- Los usuarios podrán ver y editar su propio perfil
- El login con Google funcionará correctamente
