# Sistema de Apuestas - Big House

Sistema completo de apuestas por favoritos con panel de administración y panel de usuario, construido con React y Firebase.

## Características

### Panel de Administración
- **Gestión de Usuarios**: Crear, editar, borrar y cambiar contraseñas
- **Habilitar/Deshabilitar usuarios** por evento
- **Gestión de Eventos**: Crear eventos con banners e iconos
- **Generador Inteligente de Brackets**: Distribuye favoritos en extremos opuestos
- **Confirmación de Apuestas**: Panel para confirmar pagos pendientes
- **Configuración de Comisión**: Ajustar el % que se queda la casa

### Panel de Usuario
- **Votación por Favorito**: Votar independientemente de apostar
- **Sistema de Apuestas**: Apostar con montos personalizados
- **Visualización de Brackets**: Ver estructura de competencia
- **Ganadores y Rankings**: Top votados general y por evento
- **Sistema de Insignias**: Insignias temáticas por tipo de evento
- **Perfil de Usuario**: Subir foto y ver historial

### Sistema de Premios
- **Cálculo Dinámico de Odds**: Basado en votos y apuestas
- **Sistema tipo Bolsa de Valores**: Menos votos + más apuestas = más pago
- **Comisión Configurable**: % ajustable por evento

## Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/Kazragore34/bighouselscustom.git
cd bighouselscustom
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Firebase**

   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - Agrega una aplicación web
   - Copia las credenciales de configuración

4. **Configurar variables de entorno**

   Crea un archivo `.env` en la raíz del proyecto:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

5. **Configurar Firestore**

   En Firebase Console > Firestore Database, crea las siguientes colecciones:
   - `users`
   - `events`
   - `brackets`
   - `votes`
   - `bets`
   - `eventParticipants`

   Y configura las reglas de seguridad (ver sección de Reglas de Seguridad)

6. **Habilitar Storage**

   En Firebase Console > Storage, habilita Firebase Storage para subir banners y fotos.

## Reglas de Seguridad de Firestore

Configura estas reglas en Firebase Console > Firestore Database > Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios - Solo lectura para usuarios autenticados, escritura solo para admin
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Eventos - Lectura para todos, escritura solo admin
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Votos - Lectura para todos, escritura para usuarios autenticados
    match /votes/{voteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Apuestas - Lectura para todos, escritura para usuarios autenticados
    match /bets/{betId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Brackets - Lectura para todos, escritura solo admin
    match /brackets/{bracketId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
    
    // Participantes de eventos - Lectura para todos, escritura solo admin
    match /eventParticipants/{participantId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'ADMIN';
    }
  }
}
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm run preview
```

## Crear Usuario Admin

Para crear el primer usuario administrador, puedes hacerlo directamente desde Firebase Console o usar la consola del navegador después de iniciar sesión:

1. Inicia sesión con cualquier usuario
2. Abre la consola del navegador (F12)
3. Ejecuta:
```javascript
// Esto es solo un ejemplo - en producción deberías hacerlo desde el panel admin
// después de crear un usuario normal y cambiar su tipo a ADMIN
```

O mejor aún, crea un usuario normal desde el panel admin y luego edítalo para cambiar su tipo a "ADMIN".

## Estructura del Proyecto

```
src/
├── components/
│   ├── admin/          # Componentes del panel admin
│   ├── user/            # Componentes del panel usuario
│   ├── shared/          # Componentes compartidos
│   └── ui/              # Componentes UI reutilizables
├── services/            # Servicios de Firebase
├── utils/               # Utilidades (hash, cálculos, etc.)
├── context/             # Contextos de React (Auth)
└── App.jsx              # Componente principal
```

## Tipos de Usuario

- **NO_PARTICIPA**: No puede votar ni apostar
- **PARTICIPANTE**: Puede votar y apostar
- **VOTANTE_APOSTADOR**: Puede votar y apostar
- **ADMIN**: Acceso completo al panel de administración

## Iconos de Eventos

Los iconos disponibles son:
- `car` - Carreras de autos
- `boxing` - Peleas de box
- `running` - Carreras a pie
- `search` - Eventos de búsqueda
- `trophy` - Eventos generales

## Notas Importantes

- Las contraseñas se almacenan hasheadas usando bcryptjs
- Las apuestas quedan en estado "pending" hasta que el admin las confirme
- Los brackets se generan automáticamente distribuyendo favoritos en extremos opuestos
- El sistema de odds es dinámico y se recalcula basado en votos y apuestas

## Licencia

Este proyecto es privado y de uso exclusivo.
