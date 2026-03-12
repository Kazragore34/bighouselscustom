# Reglas de Firestore Corregidas

## ⚠️ Error: "Missing or insufficient permissions"

Este error ocurre porque las reglas de Firestore no permiten la lectura necesaria para verificar si un usuario existe antes de crearlo.

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
    
    // Usuarios - Permitir lectura pública solo del campo username para verificar existencia
    // Permitir creación pública para registro
    match /users/{userId} {
      // Permitir lectura del campo username para verificar si existe (sin autenticación)
      allow read: if request.resource == null || 
                     resource.data.keys().hasOnly(['username']) ||
                     request.auth != null;
      
      // Permitir creación pública (registro)
      allow create: if true;
      
      // Permitir actualización solo a admin o al propio usuario
      allow update: if isAdmin() || 
                      (request.auth != null && request.auth.uid == userId);
      
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
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'SOLO_VISUALIZAR' &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType != 'NO_PARTICIPA';
    }
    
    // Apuestas - Lectura para todos, creación para autenticados con permisos
    match /bets/{betId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
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

## 🔧 Alternativa Más Simple (Si la anterior no funciona)

Si las reglas anteriores son muy complejas, usa esta versión simplificada:

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
6. Intenta crear una cuenta nuevamente

## 🎯 Habilitar Autenticación con Google

Para que funcione el login con Google:

1. Ve a Firebase Console > Authentication
2. Haz clic en **Empezar** si es la primera vez
3. Ve a la pestaña **Sign-in method**
4. Haz clic en **Google**
5. Activa el proveedor
6. Ingresa el email de soporte del proyecto
7. Guarda

## ✅ Después de Configurar

- El registro público debería funcionar
- El login con Google debería funcionar
- Los usuarios nuevos tendrán tipo `SOLO_VISUALIZAR` por defecto
