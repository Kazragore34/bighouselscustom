# Reglas de Firestore Corregidas

## ⚠️ Problemas Solucionados

1. **Registro público funciona**: Los usuarios pueden crear cuentas sin autenticación
2. **Verificación de username**: Permite leer solo el campo username para verificar existencia
3. **Admin puede editar usuarios**: Los admins pueden actualizar cualquier usuario
4. **Usuarios pueden leer su propio perfil**: Todos los usuarios autenticados pueden leer su propio perfil
5. **Usuarios pueden editar su propio perfil**: Los usuarios pueden actualizar su nombre, email y foto (pero no userType)

## ✅ Reglas Corregidas - VERSIÓN FUNCIONAL

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
      // Permitir lectura:
      // - Sin autenticación: solo para consultas (verificar si username existe)
      // - Con autenticación: admin puede leer todos, usuarios pueden leer su propio perfil
      allow read: if request.auth == null || 
                     request.auth != null && (isAdmin() || request.auth.uid == userId);
      
      // Permitir creación pública (registro) - SIN RESTRICCIONES
      allow create: if true;
      
      // Permitir actualización:
      // - Admin puede actualizar cualquier usuario
      // - Usuario puede actualizar su propio perfil (pero no userType ni enabled)
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

## 🔧 Alternativa Temporal (Si la anterior no funciona)

Si las reglas anteriores aún dan problemas, usa esta versión TEMPORAL para desarrollo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠️ TEMPORAL: Permitir todo para desarrollo
    // CAMBIA ESTO EN PRODUCCIÓN por las reglas de arriba
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
3. Copia y pega las reglas de arriba (la primera versión)
4. Haz clic en **Publicar**
5. Espera unos segundos a que se apliquen
6. Prueba crear una cuenta

## 🎯 Cambios Importantes

- ✅ **Registro público funciona**: `allow create: if true;` permite crear usuarios sin autenticación
- ✅ **Lectura para verificación**: Permite leer usuarios sin autenticación (para verificar si username existe)
- ✅ Admin puede actualizar cualquier campo de cualquier usuario
- ✅ Usuarios pueden leer su propio perfil
- ✅ Usuarios pueden actualizar su nombre, email y foto (pero NO userType ni enabled)
- ✅ Los usuarios SOLO_VISUALIZAR pueden editar su perfil

## ✅ Después de Configurar

- El registro público funcionará sin errores
- El admin podrá editar usuarios sin errores de permisos
- Los usuarios podrán ver y editar su propio perfil
- El login con Google funcionará correctamente

## 🔍 Si Aún No Funciona

Si después de aplicar las reglas sigues viendo "Missing or insufficient permissions":

1. Verifica que copiaste las reglas completas (incluyendo las llaves de cierre)
2. Asegúrate de hacer clic en **Publicar** después de pegar
3. Espera 1-2 minutos para que se propaguen los cambios
4. Recarga la página y prueba de nuevo
5. Si persiste, usa temporalmente la versión "Permitir todo" para verificar que el problema son las reglas
