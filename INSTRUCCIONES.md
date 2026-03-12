# Instrucciones de Uso - Sistema de Apuestas Big House

## 🚀 Inicio Rápido

### 1. Instalación
```bash
npm install
```

### 2. Configuración de Firebase
Sigue las instrucciones en `FIREBASE_SETUP.md` para configurar Firebase.

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz con tus credenciales de Firebase:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```

### 5. Build para Producción
```bash
npm run build
npm run preview
```

## 📋 Flujo de Trabajo

### Para el Administrador

1. **Crear Usuario Admin**
   - Primero, crea un usuario normal desde Firebase Console o usando un script
   - Luego edítalo para cambiar su tipo a "ADMIN"

2. **Gestionar Usuarios** (`/admin/users`)
   - Crear nuevos usuarios
   - Habilitar/deshabilitar usuarios por evento
   - Editar información de usuarios
   - Cambiar contraseñas
   - Eliminar usuarios

3. **Crear Eventos** (`/admin/events`)
   - Crear nuevo evento con nombre, descripción, tipo
   - Subir banner del evento
   - Seleccionar icono (carro, box, running, search, trophy)
   - Configurar tipo de bracket (1v1, 2v2, 10x10, custom)
   - Establecer % de comisión de la casa
   - Seleccionar participantes habilitados
   - Activar evento cuando esté listo

4. **Generar Brackets**
   - Los brackets se generan automáticamente cuando creas un evento
   - El sistema detecta favoritos (combinación de votos y apuestas)
   - Distribuye favoritos en extremos opuestos para mantener emoción
   - Puedes editar manualmente los brackets si es necesario

5. **Confirmar Apuestas** (`/admin/bets`)
   - Ver apuestas pendientes
   - Confirmar pagos cuando el usuario haya pagado en el taller
   - Las apuestas confirmadas se consideran en el cálculo de odds

### Para los Usuarios

1. **Iniciar Sesión**
   - Usa tu usuario y contraseña proporcionados por el admin

2. **Seleccionar Evento** (`/events`)
   - Ver eventos activos en recuadros grandes con banners
   - Click en un evento para entrar

3. **Votar por Favorito**
   - Puedes votar por tu participante favorito
   - Solo puedes votar una vez por evento
   - El voto es independiente de la apuesta

4. **Apostar**
   - Selecciona un participante
   - Ingresa el monto que deseas apostar
   - Click en "Apostar"
   - Aparecerá un modal: "Acérquese al taller para pagar"
   - La apuesta quedará pendiente hasta que el admin la confirme

5. **Ver Brackets**
   - Visualiza la estructura de competencia
   - Ve quién avanza en cada ronda

6. **Ver Ganadores y Rankings**
   - Top más votado (general y por evento)
   - Ganadores con sus insignias

## 🎯 Tipos de Usuario

- **NO_PARTICIPA**: No puede votar ni apostar
- **PARTICIPANTE**: Puede votar y apostar
- **VOTANTE_APOSTADOR**: Puede votar y apostar
- **ADMIN**: Acceso completo al panel de administración

## 💰 Sistema de Premios

El sistema calcula premios dinámicamente basado en:

- **Votos**: Cantidad de personas que votaron por el participante
- **Apuestas**: Monto total apostado por el participante
- **Odds**: Se calculan inversamente proporcionales a la popularidad
  - Menos votos + más apuestas = odds más altas = más pago
  - Más votos + menos apuestas = odds más bajas = menos pago
- **Comisión**: Un % configurable se queda la casa

**Fórmula de Premio:**
```
Premio = Monto Apostado × Odds × (1 - Comisión/100)
```

## 🏆 Sistema de Insignias

Los ganadores reciben insignias con iconos temáticos:
- 🚗 Carro - Para carreras de autos
- 🥊 Box - Para peleas
- 🏃 Corriendo - Para carreras a pie
- 🔍 Búsqueda - Para eventos de búsqueda
- 🏆 Trofeo - Para eventos generales

## 📝 Notas Importantes

1. **Seguridad**: Las contraseñas se almacenan hasheadas con bcryptjs
2. **Apuestas Pendientes**: Todas las apuestas empiezan como "pending" hasta confirmación del admin
3. **Brackets Inteligentes**: El sistema detecta automáticamente favoritos y los distribuye estratégicamente
4. **Votos vs Apuestas**: Son independientes - puedes votar por uno y apostar por otro
5. **Habilitar/Deshabilitar**: Los usuarios se habilitan/deshabilitan por evento, no globalmente

## 🐛 Solución de Problemas

### Error de autenticación
- Verifica que las credenciales de Firebase estén correctas en `.env`
- Asegúrate de que el usuario esté habilitado

### Las imágenes no cargan
- Verifica que Firebase Storage esté configurado
- Revisa las reglas de Storage

### No puedo crear usuarios
- Verifica que estés logueado como ADMIN
- Revisa las reglas de Firestore

### Las apuestas no se confirman
- Asegúrate de estar en el panel admin (`/admin/bets`)
- Verifica que tengas permisos de admin

## 📞 Soporte

Para problemas o preguntas, revisa:
- `README.md` - Documentación general
- `FIREBASE_SETUP.md` - Configuración de Firebase
- Código fuente - Comentarios en los archivos principales
