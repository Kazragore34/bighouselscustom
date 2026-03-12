# Reglas de Firestore Seguras - Los Santos Custom

Estas son las reglas de seguridad recomendadas para Firestore. **IMPORTANTE**: Estas reglas requieren que uses Firebase Authentication estándar (no el sistema personalizado actual). Si quieres mantener el sistema personalizado, deberás ajustar las reglas.

## Reglas Completas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function getUserType() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType;
    }
    
    // Colección de usuarios
    match /users/{userId} {
      // Cualquiera puede leer username para verificar existencia
      allow read: if true;
      
      // Cualquiera puede crear su propio usuario (registro público)
      allow create: if request.resource.data.userType == 'SOLO_VISUALIZAR' || 
                       request.resource.data.userType == 'PARTICIPANTE' ||
                       request.resource.data.userType == 'VOTANTE_APOSTADOR';
      
      // Solo el propio usuario o admin puede actualizar
      allow update: if isOwner(userId) || isAdmin();
      
      // Solo admin puede eliminar
      allow delete: if isAdmin();
    }
    
    // Colección de eventos
    match /events/{eventId} {
      // Todos pueden leer eventos activos y completados
      allow read: if true;
      
      // Solo admin puede crear eventos
      allow create: if isAdmin();
      
      // Solo admin puede actualizar eventos
      allow update: if isAdmin();
      
      // Solo admin puede eliminar eventos
      allow delete: if isAdmin();
    }
    
    // Colección de participantes de eventos
    match /eventParticipants/{participantId} {
      // Todos pueden leer
      allow read: if true;
      
      // Solo admin puede crear/actualizar/eliminar
      allow write: if isAdmin();
    }
    
    // Colección de votos
    match /votes/{voteId} {
      // Usuarios autenticados pueden leer sus propios votos
      allow read: if isAuthenticated();
      
      // Usuarios con permisos pueden crear votos
      allow create: if isAuthenticated() && 
                       (getUserType() == 'PARTICIPANTE' || 
                        getUserType() == 'VOTANTE_APOSTADOR' || 
                        getUserType() == 'ADMIN');
      
      // Solo admin puede actualizar/eliminar
      allow update, delete: if isAdmin();
    }
    
    // Colección de apuestas
    match /bets/{betId} {
      // Usuarios autenticados pueden leer sus propias apuestas
      allow read: if isAuthenticated();
      
      // Usuarios con permisos pueden crear apuestas
      allow create: if isAuthenticated() && 
                       (getUserType() == 'PARTICIPANTE' || 
                        getUserType() == 'VOTANTE_APOSTADOR' || 
                        getUserType() == 'ADMIN');
      
      // Solo admin puede actualizar (confirmar apuestas)
      allow update: if isAdmin();
      
      // Solo admin puede eliminar
      allow delete: if isAdmin();
    }
    
    // Colección de brackets
    match /brackets/{bracketId} {
      // Todos pueden leer brackets
      allow read: if true;
      
      // Solo admin puede crear/actualizar/eliminar brackets
      allow write: if isAdmin();
    }
    
    // Colección de equipos
    match /teams/{teamId} {
      // Todos pueden leer equipos
      allow read: if true;
      
      // Usuarios autenticados pueden crear equipos
      allow create: if isAuthenticated();
      
      // Solo miembros del equipo o admin pueden actualizar
      allow update: if isAuthenticated() && 
                       (resource.data.members.hasAny([request.auth.uid]) || isAdmin());
      
      // Solo admin puede eliminar
      allow delete: if isAdmin();
    }
    
    // Colección de invitaciones a equipos
    match /teamInvitations/{invitationId} {
      // Usuarios autenticados pueden leer sus propias invitaciones
      allow read: if isAuthenticated() && 
                     (resource.data.invitedUserId == request.auth.uid || 
                      resource.data.teamOwnerId == request.auth.uid);
      
      // Usuarios autenticados pueden crear invitaciones
      allow create: if isAuthenticated();
      
      // Usuarios autenticados pueden actualizar sus propias invitaciones
      allow update: if isAuthenticated() && 
                       (resource.data.invitedUserId == request.auth.uid || 
                        resource.data.teamOwnerId == request.auth.uid);
      
      // Usuarios autenticados pueden eliminar sus propias invitaciones
      allow delete: if isAuthenticated() && 
                       (resource.data.invitedUserId == request.auth.uid || 
                        resource.data.teamOwnerId == request.auth.uid);
    }
  }
}
```

## Reglas Simplificadas (Si usas autenticación personalizada)

Si estás usando el sistema de autenticación personalizado (sin Firebase Auth), usa estas reglas más permisivas pero con validaciones básicas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function para verificar si es admin (basado en userType en el documento)
    function isAdminUser(userId) {
      let userDoc = get(/databases/$(database)/documents/users/$(userId));
      return userDoc != null && userDoc.data.userType == 'ADMIN';
    }
    
    // Colección de usuarios
    match /users/{userId} {
      // Todos pueden leer (necesario para verificar existencia)
      allow read: if true;
      
      // Cualquiera puede crear usuario, pero NO puede ser ADMIN
      allow create: if request.resource.data.userType != 'ADMIN';
      
      // Cualquiera puede actualizar, pero validaciones básicas
      allow update: if request.resource.data.userType != 'ADMIN' || 
                       isAdminUser(userId);
      
      // Solo admin puede eliminar
      allow delete: if isAdminUser(userId);
    }
    
    // Colección de eventos
    match /events/{eventId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden crear/actualizar (validación en frontend)
      allow write: if true;
    }
    
    // Colección de participantes de eventos
    match /eventParticipants/{participantId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (validación en frontend)
      allow write: if true;
    }
    
    // Colección de votos
    match /votes/{voteId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden crear (validación en frontend)
      allow create: if true;
      
      // Solo lectura para actualizar (admin confirma desde frontend)
      allow update: if true;
      allow delete: if true;
    }
    
    // Colección de apuestas
    match /bets/{betId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden crear (validación en frontend)
      allow create: if true;
      
      // Todos pueden actualizar (admin confirma desde frontend)
      allow update: if true;
      allow delete: if true;
    }
    
    // Colección de brackets
    match /brackets/{bracketId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (validación en frontend)
      allow write: if true;
    }
    
    // Colección de equipos
    match /teams/{teamId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (validación en frontend)
      allow write: if true;
    }
    
    // Colección de invitaciones a equipos
    match /teamInvitations/{invitationId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (validación en frontend)
      allow write: if true;
    }
  }
}
```

## Notas Importantes

1. **Autenticación Personalizada**: Si usas autenticación personalizada (como actualmente), las reglas seguras no funcionarán completamente porque `request.auth.uid` no estará disponible. En ese caso, usa las reglas simplificadas y confía en la validación del frontend.

2. **Migración a Firebase Auth**: Para máxima seguridad, considera migrar a Firebase Authentication estándar, que permitirá usar las reglas completas.

3. **Validación en Frontend**: Con las reglas simplificadas, es CRÍTICO validar todo en el frontend:
   - No permitir crear usuarios ADMIN desde el frontend público
   - Validar permisos antes de crear votos/apuestas
   - Validar que solo admins puedan modificar eventos

4. **Testing**: Prueba las reglas en el simulador de Firestore antes de aplicarlas en producción.

## Cómo Aplicar las Reglas

1. Ve a Firebase Console → Firestore Database → Rules
2. Copia las reglas que prefieras (completas o simplificadas)
3. Haz clic en "Publish"
4. Prueba que todo funcione correctamente
