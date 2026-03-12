# Cómo Crear el Primer Usuario Admin

## Método 1: Usando Script de Node.js (Recomendado)

### Paso 1: Ejecutar el script
```bash
node scripts/createAdmin.js
```

El script te pedirá:
- Usuario admin
- Contraseña
- Email (opcional)

Y creará automáticamente el usuario admin en Firestore.

### Paso 2: Si el script no funciona, generar solo el hash

```bash
node scripts/hashPassword.js
```

Esto te dará el hash de la contraseña que puedes copiar.

## Método 2: Crear Manualmente en Firebase Console

### Paso 1: Generar el hash de la contraseña

Ejecuta:
```bash
node scripts/hashPassword.js
```

Ingresa tu contraseña y copia el hash que te muestra.

### Paso 2: Crear el documento en Firestore

1. Ve a [Firebase Console](https://console.firebase.google.com/project/apuesta-7c52d/firestore)
2. Haz clic en **Crear colección**
3. Nombre de la colección: `users`
4. Haz clic en **Siguiente**
5. Crea el primer documento con estos campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `username` | string | admin (o el nombre que quieras) |
| `password` | string | [Pega aquí el hash generado] |
| `userType` | string | ADMIN |
| `email` | string | tu@email.com (opcional) |
| `photoURL` | string | (deja vacío) |
| `enabled` | boolean | true |
| `badges` | array | (deja vacío o borra el campo) |
| `createdAt` | timestamp | (usa el botón de timestamp actual) |

### Estructura del Documento en Firestore

```
users (colección)
  └── [ID automático] (documento)
      ├── username: "admin" (string)
      ├── password: "$2a$10$..." (string) ← Hash bcrypt
      ├── userType: "ADMIN" (string)
      ├── email: "admin@example.com" (string)
      ├── photoURL: "" (string)
      ├── enabled: true (boolean)
      ├── badges: [] (array)
      └── createdAt: [timestamp] (timestamp)
```

## Método 3: Usar Herramienta Online de Bcrypt

Si no puedes ejecutar Node.js:

1. Ve a https://bcrypt-generator.com/
2. Ingresa tu contraseña
3. Número de rounds: 10
4. Copia el hash generado
5. Úsalo en Firebase como se explica en el Método 2

## Tipos de Campos en Firestore

- **string**: Para texto (username, password, email, userType, photoURL)
- **boolean**: Para verdadero/falso (enabled)
- **array**: Para listas (badges)
- **timestamp**: Para fechas (createdAt)

## Verificación

Después de crear el usuario:

1. Ve a la aplicación
2. Inicia sesión con:
   - Usuario: el que pusiste en `username`
   - Contraseña: la contraseña original (no el hash)

## Solución de Problemas

### "Usuario no encontrado"
- Verifica que la colección se llame exactamente `users`
- Verifica que el campo `username` tenga el valor correcto

### "Contraseña incorrecta"
- Verifica que el hash de la contraseña sea correcto
- Asegúrate de usar la contraseña original para login, no el hash

### "Usuario deshabilitado"
- Verifica que el campo `enabled` sea `true` (boolean)
