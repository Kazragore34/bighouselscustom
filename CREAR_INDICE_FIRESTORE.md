# 🔥 Crear Índice en Firestore (Opcional)

## ⚠️ Nota Importante

El código ya está corregido para **NO necesitar** este índice. La consulta ahora ordena en memoria después de obtener los datos.

## Si Quieres Crear el Índice de Todas Formas

Si prefieres tener el índice para mejor rendimiento con muchos datos:

1. **Opción 1: Click en el enlace del error**
   - Cuando veas el error, haz clic en el enlace que aparece
   - Firebase te llevará directamente a crear el índice
   - Haz clic en "Crear índice"

2. **Opción 2: Manualmente**
   - Ve a: https://console.firebase.google.com/project/apuesta-7c52d/firestore/indexes
   - Haz clic en "Crear índice"
   - Configura:
     - **Colección**: `bets`
     - **Campos a indexar**:
       - Campo: `status`, Orden: Ascendente
       - Campo: `createdAt`, Orden: Descendente
     - Haz clic en "Crear"

## ✅ Solución Actual (Sin Índice)

El código ahora:
- Obtiene todas las apuestas con `status == 'pending'`
- Las ordena en memoria por `createdAt` descendente
- **No requiere índice** - funciona inmediatamente

Esto es perfecto para desarrollo y funciona bien hasta varios miles de apuestas.
