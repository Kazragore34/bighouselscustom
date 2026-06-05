# VANTAGE — Plataforma de Apuestas IC

Plataforma de apuestas con **dinero ficticio in-character (IC)** para comunidades FiveM / GTA RP.  
**Live:** [sortia.eu](https://sortia.eu) · **Repo:** [github.com/Kazragore34/bighouselscustom](https://github.com/Kazragore34/bighouselscustom)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Auth | Firebase Auth (Google OAuth + usuario/contraseña) |
| Base de datos | Firestore (NoSQL) |
| Estilos | CSS propio (sin Tailwind) — paleta negro/dorado |
| Fuentes | Cinzel (títulos) + DM Sans (cuerpo) via Google Fonts |
| Deploy | Hostinger · auto-pull desde rama `main` de GitHub |

**Proyecto Firebase:** `apuesta-7c52d`  
**Sin Firebase Storage** — imágenes via URL externa (Imgur, ImgBB, etc.)

---

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `PENDIENTE_VERIFICACION` | Default al registrarse. Solo ve eventos, no interactúa. |
| `APOSTADOR` | Admin verifica → puede votar y apostar en cualquier evento. |
| `PARTICIPANTE` | Admin añade al evento → puede competir. |
| `ADMIN` | Acceso total. |

**Flujo:** Usuario se registra → `PENDIENTE_VERIFICACION` → Admin pulsa "Verificar" → `APOSTADOR`

---

## Modos de competencia

| Modo | Descripción |
|------|-------------|
| A — `CARRERA_CLASICA` | Una sesión, ganadores por posición final. |
| B — `ELIMINACION_PROGRESIVA` | Rondas que eliminan participantes. |
| C — `BRACKET_TORNEO` | Eliminación directa 1v1, bracket guardado en Firestore. |
| D — `MULTI_FASE` | Clasificatorias + final (sub-eventos). |
| E — `RONDAS_INDEPENDIENTES` | Cada ronda es independiente con su propio pozo. |

---

## Sistema de pagos (parimutuel)

```
Pozo bruto   = Σ todas las apuestas confirmadas
Pozo neto    = Pozo bruto × (1 − comisión%)
Tu pago      = Pozo neto × (tu apuesta / Σ apuestas al ganador)
```

El total pagado a ganadores **nunca supera el pozo neto**.  
El admin paga manualmente en IC dentro del juego. Ver `/admin/apuestas` para saber cuánto.

---

## Deploy

```bash
# 1. Instalar dependencias (solo primera vez)
npm install

# 2. Build de producción
npm run build

# 3. Copiar assets a raíz del repo
Remove-Item assets -Recurse -Force
Copy-Item dist/assets assets -Recurse
Copy-Item dist/index.html index.html

# 4. Commit y push (Hostinger hace pull automático)
git add src/ assets/ index.html
git commit -m "descripción"
git push origin main
```

---

## Variables de entorno

Archivo `.env` en la raíz (no está en git):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=apuesta-7c52d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=apuesta-7c52d
VITE_FIREBASE_STORAGE_BUCKET=apuesta-7c52d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Firestore — Reglas actuales

Las reglas están en modo **abierto** (`allow read, write: if true`).  
La seguridad se gestiona en el frontend. Ver Firebase Console → Firestore → Reglas.

---

## Crear un admin

1. Registra una cuenta normalmente (Google o usuario/contraseña).
2. Ve a **Firebase Console → Firestore → colección `users`**.
3. Busca el documento del usuario y cambia `userType` de `PENDIENTE_VERIFICACION` a `ADMIN`.

---

## Documentación técnica

Ver [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) para estructura de archivos, colecciones de Firestore, flujos de datos y guía para desarrolladores.
