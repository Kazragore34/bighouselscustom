# Reglas de Firestore para Autenticación Personalizada

## ⚠️ IMPORTANTE: Estas reglas son para sistemas con autenticación personalizada

Si estás usando autenticación personalizada (sin Firebase Auth), usa estas reglas. La validación de permisos se hace en el frontend.

## ✅ Reglas que Funcionan con Autenticación Personalizada

Copia y pega estas reglas en Firebase Console > Firestore Database > Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Colección de usuarios
    match /users/{userId} {
      // Todos pueden leer (necesario para login y verificar existencia)
      allow read: if true;
      
      // Cualquiera puede crear usuario, pero NO puede ser ADMIN desde el frontend público
      // El frontend debe validar que userType != 'ADMIN' al crear
      allow create: if request.resource.data.userType != 'ADMIN';
      
      // Cualquiera puede actualizar (el frontend valida permisos)
      allow update: if true;
      
      // Cualquiera puede eliminar (el frontend valida que sea admin)
      allow delete: if true;
    }
    
    // Colección de eventos
    match /events/{eventId} {
      // Todos pueden leer eventos
      allow read: if true;
      
      // Todos pueden crear/actualizar/eliminar (el frontend valida que sea admin)
      allow write: if true;
    }
    
    // Colección de participantes de eventos
    match /eventParticipants/{participantId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (el frontend valida que sea admin)
      allow write: if true;
    }
    
    // Colección de votos
    match /votes/{voteId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden crear (el frontend valida permisos de usuario)
      allow create: if true;
      
      // Todos pueden actualizar/eliminar (el frontend valida que sea admin)
      allow update, delete: if true;
    }
    
    // Colección de apuestas
    match /bets/{betId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden crear (el frontend valida permisos de usuario)
      allow create: if true;
      
      // Todos pueden actualizar (el frontend valida que sea admin para confirmar)
      allow update: if true;
      
      // Todos pueden eliminar (el frontend valida que sea admin)
      allow delete: if true;
    }
    
    // Colección de brackets
    match /brackets/{bracketId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (el frontend valida que sea admin)
      allow write: if true;
    }
    
    // Colección de equipos
    match /teams/{teamId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (el frontend valida permisos)
      allow write: if true;
    }
    
    // Colección de invitaciones a equipos
    match /teamInvitations/{invitationId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (el frontend valida permisos)
      allow write: if true;
    }
  }
}
```

## 🔒 Seguridad con Autenticación Personalizada

**IMPORTANTE**: Con estas reglas, la seguridad depende completamente del frontend. Asegúrate de:

1. **Validar permisos en el frontend**: 
   - Solo usuarios con `userType === 'ADMIN'` pueden crear/editar/eliminar eventos
   - Solo usuarios con permisos pueden votar/apostar
   - Verifica esto en cada función antes de hacer llamadas a Firestore

2. **No confiar solo en el frontend**: 
   - Considera migrar a Firebase Auth para mayor seguridad
   - O implementa un backend que valide permisos antes de escribir

3. **Validar datos**:
   - El frontend debe validar que los datos sean correctos antes de enviarlos
   - No permitir crear usuarios ADMIN desde el frontend público

## 📝 Cómo Aplicar las Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Reglas**
4. Copia y pega las reglas de arriba
5. Haz clic en **Publicar**
6. Espera unos segundos para que se propaguen los cambios

## ✅ Verificación

Después de aplicar las reglas, deberías poder:
- ✅ Crear eventos como admin
- ✅ Editar eventos como admin
- ✅ Eliminar eventos como admin
- ✅ Crear votos/apuestas como usuario con permisos
- ✅ Leer todos los datos públicos

Si sigues teniendo problemas, verifica:
- Que las reglas se hayan publicado correctamente
- Que no haya errores de sintaxis en las reglas
- Que estés usando la base de datos correcta (producción vs desarrollo)
