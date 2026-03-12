# Guía de Configuración de Firebase

## Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o selecciona un proyecto existente
3. Sigue los pasos para crear el proyecto

## Paso 2: Configurar Firestore Database

1. En el menú lateral, ve a **Firestore Database**
2. Haz clic en **Crear base de datos**
3. Selecciona **Iniciar en modo de prueba** (luego configuraremos las reglas)
4. Elige una ubicación para tu base de datos

## Paso 3: Configurar Reglas de Seguridad

1. En Firestore Database, ve a la pestaña **Reglas**
2. Copia y pega las siguientes reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function para verificar si es admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Usuarios - Lectura para autenticados, escritura solo admin
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // Eventos - Lectura para todos autenticados, escritura solo admin
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Votos - Lectura para todos, creación para autenticados
    match /votes/{voteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Apuestas - Lectura para todos, creación para autenticados, actualización solo admin
    match /bets/{betId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
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

3. Haz clic en **Publicar**

**Nota**: Las reglas anteriores requieren que el usuario esté autenticado. Como estamos usando autenticación personalizada, necesitarás ajustar las reglas según tu implementación específica o usar Firebase Admin SDK en el backend.

## Paso 4: Configurar Storage

1. En el menú lateral, ve a **Storage**
2. Haz clic en **Empezar**
3. Acepta los términos y condiciones
4. Selecciona las reglas de seguridad (puedes usar las predeterminadas por ahora)

## Paso 5: Agregar Aplicación Web

1. En la página principal del proyecto, haz clic en el icono de **Web** (`</>`)
2. Registra tu aplicación con un nombre (ej: "Big House Betting")
3. **NO** marques la casilla de Firebase Hosting
4. Haz clic en **Registrar app**

## Paso 6: Obtener Credenciales

Después de registrar la app, verás un código de configuración. Necesitarás estos valores:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## Paso 7: Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo `.env`
2. Agrega las siguientes variables (reemplaza con tus valores):

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

## Paso 8: Crear el Primer Usuario Admin

Como el sistema usa autenticación personalizada, necesitas crear el primer usuario admin manualmente:

1. Inicia la aplicación en modo desarrollo: `npm run dev`
2. Crea un usuario normal desde el panel admin (si tienes acceso)
3. O usa la consola de Firebase para crear un documento en la colección `users`:

```javascript
// En Firebase Console > Firestore > Agregar documento
// Colección: users
// ID: (generar automáticamente)
// Campos:
{
  username: "admin",
  password: "[hash de contraseña - usar bcrypt]",
  userType: "ADMIN",
  email: "admin@example.com",
  enabled: true,
  photoURL: "",
  badges: [],
  createdAt: [timestamp actual]
}
```

**Nota**: Para generar el hash de la contraseña, puedes usar un script temporal o una herramienta online de bcrypt.

## Estructura de Colecciones

Las siguientes colecciones se crearán automáticamente cuando uses la aplicación:

- `users` - Usuarios del sistema
- `events` - Eventos
- `brackets` - Brackets de eventos
- `votes` - Votos de favoritos
- `bets` - Apuestas
- `eventParticipants` - Participantes por evento

## Solución de Problemas

### Error: "Firebase: Error (auth/unauthorized)"
- Verifica que las reglas de Firestore estén configuradas correctamente
- Asegúrate de que el usuario esté autenticado

### Error: "Permission denied"
- Revisa las reglas de seguridad de Firestore
- Verifica que el usuario tenga los permisos necesarios

### Las imágenes no se cargan
- Verifica que Storage esté habilitado
- Revisa las reglas de Storage
- Asegúrate de que las URLs de las imágenes sean públicas o que tengas permisos de lectura

## Próximos Pasos

1. Configura las variables de entorno
2. Inicia la aplicación: `npm run dev`
3. Crea el primer usuario admin
4. Comienza a crear eventos y usuarios
