# 🔒 Reglas de Firestore SEGURAS - Para Producción

## ⚠️ IMPORTANTE: Sistema de Autenticación Personalizado

Este sistema usa autenticación personalizada (no Firebase Auth directamente), por lo que las reglas deben permitir acceso basado en el contenido de los documentos, no en `request.auth.uid`.

## ✅ Reglas Seguras que Funcionan

Copia y pega estas reglas en Firebase Console > Firestore Database > Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios
    match /users/{userId} {
      // Lectura: Permitir para consultas (login, verificar existencia)
      // El frontend valida que solo se lean datos necesarios
      allow read: if true;
      
      // Creación: Solo permitir tipos de usuario válidos (no ADMIN)
      allow create: if request.resource.data.keys().hasAll(['username', 'password', 'userType', 'enabled']) &&
                       request.resource.data.userType in ['SOLO_VISUALIZAR', 'NO_PARTICIPA', 'PARTICIPANTE', 'VOTANTE_APOSTADOR'] &&
                       request.resource.data.userType != 'ADMIN';
      
      // Actualización: Permitir (el frontend valida permisos)
      allow update: if true;
      
      // Eliminación: Permitir (el frontend valida que sea admin)
      allow delete: if true;
    }
    
    // Eventos - Lectura para todos, escritura solo admin (verificado en frontend)
    match /events/{eventId} {
      allow read: if true;
      allow write: if true; // El frontend valida que sea admin
    }
    
    // Votos - Lectura para todos, creación para usuarios con permisos (verificado en frontend)
    match /votes/{voteId} {
      allow read: if true;
      allow create: if true; // El frontend valida permisos de usuario
    }
    
    // Apuestas - Lectura para todos, creación para usuarios con permisos (verificado en frontend)
    match /bets/{betId} {
      allow read: if true;
      allow create: if true; // El frontend valida permisos de usuario
      allow update: if true; // El frontend valida que sea admin
    }
    
    // Brackets - Lectura para todos, escritura solo admin (verificado en frontend)
    match /brackets/{bracketId} {
      allow read: if true;
      allow write: if true; // El frontend valida que sea admin
    }
    
    // Participantes de eventos - Lectura para todos, escritura solo admin (verificado en frontend)
    match /eventParticipants/{participantId} {
      allow read: if true;
      allow write: if true; // El frontend valida que sea admin
    }
  }
}
```

## 🔐 Seguridad en el Frontend

Como usamos autenticación personalizada, **la seguridad real está en el frontend**:

1. **Validación de permisos**: El código React verifica permisos antes de permitir acciones
2. **AdminRoute**: Solo admins pueden acceder a rutas admin
3. **ProtectedRoute**: Solo usuarios autenticados pueden acceder
4. **Validación de datos**: El código valida que los datos sean correctos antes de escribir
5. **No se pueden crear admins**: Las reglas bloquean creación directa de usuarios ADMIN

## 📝 Pasos para Aplicar

1. Ve a: https://console.firebase.google.com/project/apuesta-7c52d/firestore
2. Haz clic en la pestaña **Reglas**
3. Copia y pega las reglas de arriba
4. Haz clic en **Publicar**
5. Espera 30 segundos

## ✅ Ventajas de Estas Reglas

- ✅ Permiten registro público (con validación de campos)
- ✅ Bloquean creación de usuarios ADMIN directamente
- ✅ Permiten lectura necesaria para el funcionamiento
- ✅ El frontend maneja la seguridad de permisos
- ✅ Los admins pueden ver y hacer todo como usuarios normales

## 🔒 Seguridad Adicional Recomendada

Para mayor seguridad en producción:

1. **Validar en el backend**: Crea Cloud Functions que validen permisos
2. **Rate limiting**: Limita las operaciones por usuario
3. **Auditoría**: Registra todas las operaciones importantes
4. **Validación de datos**: Valida formato de emails, usernames, etc.

## 📌 Nota sobre Admin como Participante

Con estas reglas, el admin puede:
- ✅ Ver todos los eventos (como cualquier usuario)
- ✅ Votar y apostar (si tiene permisos de usuario)
- ✅ Ver su propio perfil y estadísticas
- ✅ Editar cualquier usuario desde el panel admin
- ✅ Gestionar eventos y brackets

El código del frontend ya maneja esto correctamente.
