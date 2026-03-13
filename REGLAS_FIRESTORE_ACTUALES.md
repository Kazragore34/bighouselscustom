# 🔥 Reglas de Firestore ACTUALES - Para Aplicar AHORA

## ⚠️ IMPORTANTE: Estas son las reglas que DEBES tener en Firebase Console

Si estás usando autenticación personalizada (sin Firebase Auth), copia y pega estas reglas EXACTAMENTE en Firebase Console:

## 📋 Reglas Completas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Colección de usuarios
    match /users/{userId} {
      // Todos pueden leer (necesario para login y verificar existencia)
      allow read: if true;
      
      // Cualquiera puede crear usuario, pero NO puede ser ADMIN desde el frontend público
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
    
    // Colección de participantes de eventos - CRÍTICO PARA TU PROBLEMA
    match /eventParticipants/{participantId} {
      // Todos pueden leer
      allow read: if true;
      
      // Todos pueden escribir (el frontend valida que sea admin)
      // Esto incluye: create, update, delete
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

## 📝 Cómo Aplicar las Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Reglas**
4. **BORRA TODO** lo que esté ahí actualmente
5. Copia y pega las reglas de arriba COMPLETAS
6. Haz clic en **Publicar**
7. Espera 10-30 segundos para que se propaguen los cambios

## ✅ Verificación

Después de aplicar las reglas, deberías poder:
- ✅ Crear eventos como admin
- ✅ Agregar participantes a eventos
- ✅ Los participantes se guardan en Firestore
- ✅ Los participantes se recuperan correctamente

## 🔍 Si Aún No Funciona

1. Abre la consola del navegador (F12)
2. Intenta guardar participantes
3. Busca errores que digan "Missing or insufficient permissions"
4. Si ves ese error, las reglas NO se aplicaron correctamente
5. Vuelve a Firebase Console y verifica que las reglas estén publicadas

## 🚨 IMPORTANTE

- Las reglas deben estar EXACTAMENTE como están arriba
- No cambies `allow write: if true;` por `allow create, update, delete: if true;` - debe ser `allow write: if true;`
- Asegúrate de que NO haya reglas anteriores que puedan estar bloqueando
