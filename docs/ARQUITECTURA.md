# Arquitectura técnica — VANTAGE

## Estructura de archivos

```
src/
├── main.jsx                    # Entry point React
├── App.jsx                     # Rutas (react-router-dom v7)
├── index.css                   # Variables CSS globales (--bg-*, --gold-*, etc.)
├── App.css                     # Estilos globales, utilidades, animaciones
│
├── context/
│   └── AuthContext.jsx         # Estado global de autenticación
│                                 Expone: user, login, loginGoogle, logout,
│                                         isAdmin, canBet, refreshUser
│
├── services/                   # Comunicación con Firestore
│   ├── firebase.js             # Init Firebase (db, auth, googleProvider)
│   ├── auth.js                 # login(), loginWithGoogle(), createUser()
│   ├── users.js                # CRUD usuarios
│   ├── events.js               # CRUD eventos, participantes, ganadores
│   ├── brackets.js             # Generación y lectura de brackets (determinista)
│   ├── bets.js                 # Crear/confirmar apuestas + notif admin
│   ├── votes.js                # Crear/leer votos
│   ├── teams.js                # Equipos e invitaciones
│   ├── notifications.js        # CRUD notificaciones in-app
│   ├── eventRounds.js          # Rondas independientes (Modo E)
│   └── badges.js               # Otorgar insignias automáticas
│
├── utils/
│   ├── prizeCalculator.js      # Cálculo parimutuel (calculateOdds, calculateEstimatedPayout,
│   │                             calculateWinnerPayouts)
│   ├── imageUtils.js           # fileToBase64, validateImageUrl
│   └── passwordHash.js         # bcryptjs hash/verify
│
├── components/
│   ├── public/
│   │   ├── HomePublic.jsx      # Landing sin login (/)
│   │   └── HomePublic.css
│   │
│   ├── shared/
│   │   ├── Navbar.jsx          # Barra de navegación + notificaciones in-app
│   │   ├── Login.jsx           # Login (Google + usuario/contraseña)
│   │   ├── SignUp.jsx          # Registro público
│   │   └── PaymentModal.jsx    # Popup al crear apuesta
│   │
│   ├── user/                   # Vistas de usuario logado
│   │   ├── Dashboard.jsx       # /dashboard — stats + eventos disponibles
│   │   ├── EventSelector.jsx   # Grid de eventos activos
│   │   ├── VoteBetPanel.jsx    # /events/:id — votar y apostar
│   │   ├── BracketViewer.jsx   # /events/:id/brackets — ver bracket (solo lee Firestore)
│   │   ├── BetsModal.jsx       # Modal "Mis Apuestas" (parimutuel real)
│   │   ├── Winners.jsx         # /ganadores — 3 tabs ranking
│   │   ├── Profile.jsx         # /perfil — datos, insignias, historial
│   │   └── TeamManagement.jsx  # /equipos
│   │
│   └── admin/                  # Vistas admin
│       ├── UserManagement.jsx  # /admin/usuarios — CRUD + verificar roles
│       ├── EventManagement.jsx # /admin/eventos — CRUD + ganador + finalizar
│       ├── EventControlPanel.jsx # /admin/eventos/:id — panel de rondas (Modo E)
│       ├── BracketEditor.jsx   # /admin/events/:id/brackets — editor brackets
│       ├── BetConfirmation.jsx # /admin/apuestas — confirmar pagos + ver quién cobrar
│       ├── ParticipantsModal.jsx # Modal añadir/quitar participantes
│       ├── WinnerSelectModal.jsx  # Modal seleccionar 1+ ganadores con posición
│       └── admin-shared.css    # Estilos base compartidos de admin
```

---

## Rutas de la aplicación

```
/                          → HomePublic (sin login)
/login                     → Login
/signup                    → Registro
/dashboard                 → Dashboard usuario
/events                    → Lista eventos activos
/events/:id                → Panel votar/apostar
/events/:id/brackets       → Ver bracket
/ganadores                 → Rankings (3 tabs)
/equipos                   → Gestión de equipos
/perfil                    → Perfil propio
/admin/usuarios            → Gestión usuarios (requiere ADMIN)
/admin/eventos             → Gestión eventos (requiere ADMIN)
/admin/eventos/:id         → Panel de rondas / control evento
/admin/apuestas            → Confirmación de pagos
/admin/events/:id/brackets → Editor de bracket
```

---

## Colecciones Firestore

### `users`
```
id (doc ID)         — string  Firestore auto-ID
username            — string
name                — string  (puede diferir de username)
email               — string
photoURL            — string  (URL o base64)
userType            — string  PENDIENTE_VERIFICACION | APOSTADOR | PARTICIPANTE | ADMIN
password            — string  bcrypt hash (solo usuarios no-Google)
enabled             — boolean
badges              — array   [{ id, name, icon, earnedAt }]
googleAuth          — boolean (true si vino de Google)
createdAt           — timestamp
```

### `events`
```
id                  — string
name                — string
description         — string
eventType           — string  CARRERA_COCHES | PELEA_COMBATE | DISPAROS | CARRERA_PIE | POSTA_EQUIPOS | ROL_LIBRE
competitionMode     — string  CARRERA_CLASICA | ELIMINACION_PROGRESIVA | BRACKET_TORNEO | MULTI_FASE | RONDAS_INDEPENDIENTES
status              — string  BORRADOR | ACTIVO | EN_CURSO | POSPUESTO | FINALIZADO | CANCELADO
isTeamEvent         — boolean
teamSize            — number
commissionPercent   — number  (porcentaje que retiene la casa)
maxBetPerUser       — number  (0 = sin límite)
totalWinners        — number  (cuántos ganadores hay)
maxRounds           — number  (solo Modo E — estimado)
bannerURL           — string  URL externa (no Firebase Storage)
betDeadline         — string  datetime-local
winnerId            — string | null  (primer lugar)
winners             — array   [{ userId, username, position }]
winnerSetAt         — timestamp
participantsListClosed — boolean
createdAt           — timestamp
```

### `eventParticipants`
```
id          — string
eventId     — string
userId      — string
teamId      — string | null
enabled     — boolean
joinedAt    — timestamp
```

### `brackets`
```
id          — string
eventId     — string
round       — number
isFinal     — boolean
generatedAt — timestamp
matches     — array [{
  id          string
  participants string[]  (userIds)
  winnerId    string | null
  status      'pending' | 'completed'
  isGroup     boolean
  isFinal     boolean
}]
```

> **Regla crítica:** Los brackets se generan UNA SOLA VEZ desde el admin y se guardan en Firestore. Los clientes SOLO leen, nunca generan. Esto garantiza que todos ven exactamente el mismo bracket.

### `bets`
```
id              — string
eventId         — string
userId          — string
participantId   — string
amount          — number
status          — 'pending' | 'confirmed'
roundNumber     — number | null  (null = evento completo; número = Modo E)
createdAt       — timestamp
confirmedBy     — string | null  (userId del admin)
confirmedAt     — timestamp | null
```

### `votes`
```
id            — string
eventId       — string
userId        — string
favoriteId    — string  (participantId votado)
createdAt     — timestamp
```

### `notifications`
```
id              — string
userId          — string
type            — string  apuesta_pendiente | apuesta_confirmada | apuesta_ganada |
                          apuesta_perdida | evento_inicio | evento_ronda | insignia
title           — string
message         — string
read            — boolean
createdAt       — timestamp
relatedEventId  — string | null
relatedBetId    — string | null
```

### `eventRounds` (solo Modo E)
```
id              — string
eventId         — string
roundNumber     — number
status          — 'ABIERTA' | 'CERRADA' | 'RESUELTA'
openedAt        — timestamp
closedAt        — timestamp | null
winnerId        — string | null
winnerName      — string | null
totalPool       — number
commissionAmount — number
netPool         — number
resolvedAt      — timestamp | null
```

### `teams` / `teamInvitations`
```
teams: { name, members[], createdBy, status, createdAt }
teamInvitations: { teamId, fromUserId, invitedUserId, status, createdAt }
```

---

## Flujo completo de una apuesta

```
1. Usuario escribe monto → VoteBetPanel muestra pago estimado (parimutuel)
2. Click "Apostar" → createBet() → status: 'pending'
3. Notificación automática a todos los ADMIN: "Nueva apuesta pendiente"
4. Admin va a /admin/apuestas → ve la apuesta pendiente
5. Usuario paga IC al admin en el juego
6. Admin pulsa "Confirmar Pago" → confirmBet() → status: 'confirmed'
7. Notificación al usuario: "Apuesta confirmada ✓"
8. Evento termina → Admin declara ganador en /admin/eventos
9. setEventWinners() → calcula payouts → notifica ganadores y perdedores
10. Admin va a /admin/apuestas → sección "Pagos a ganadores" → paga IC en el juego
```

---

## Cálculo de pagos (parimutuel)

```javascript
// Nunca se paga más de lo que hay en el pozo
pozo_bruto   = Σ bets confirmadas del evento
pozo_neto    = pozo_bruto × (1 − commissionPercent/100)
tu_pago      = pozo_neto × (tu_apuesta / Σ apuestas_al_ganador)
```

Implementado en `src/utils/prizeCalculator.js`:
- `calculateOdds(eventId, participantId)` — odds visuales + multiplier
- `calculateEstimatedPayout(eventId, participantId, betAmount)` — pago estimado dinámico
- `calculateWinnerPayouts(bets, winnerId, commission)` — pagos finales reales

---

## Triggers automáticos

| Acción | Trigger |
|--------|---------|
| Admin confirma apuesta | Notif usuario + badge `primera_apuesta` |
| Admin declara ganador | Notif a todos apostadores + badges ganador |
| Usuario crea apuesta | Notif a todos los admins |
| Admin abre ronda (Modo E) | — |
| Admin resuelve ronda (Modo E) | Notif apostadores de esa ronda |

---

## Insignias automáticas

Implementadas en `src/services/badges.js`. Se otorgan sin intervención del admin:

| ID | Condición |
|----|-----------|
| `primera_apuesta` | Primera apuesta confirmada |
| `primera_ganada` | Primera apuesta ganada |
| `racha_3` / `racha_5` | 3 o 5 victorias seguidas |
| `diez_ganadas` / `veinticinco_gan` | 10 / 25 victorias totales |
| `piloto`, `luchador`, etc. | Ganar un evento de ese tipo |
| `leyenda` | Ganar cualquier evento como participante |

Insignias manuales: el admin las añade directamente en Firestore al campo `badges` del usuario.
