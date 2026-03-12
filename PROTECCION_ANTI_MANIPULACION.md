# 🛡️ Sistema de Protección Anti-Manipulación

## Problema Identificado

El sistema de odds puede ser manipulado si:
- Un grupo de amigos apuesta grandes cantidades por alguien sin votos
- Muchas personas votan/apuestan estratégicamente para beneficiar a alguien
- Pocos apostadores grandes distorsionan las odds

## Soluciones Implementadas

### 1. **Ponderación Mejorada de Odds**

**Antes:**
- Votos: 60% de peso
- Dinero apostado: 40% de peso

**Ahora:**
- **Votos: 75% de peso** (principal)
- **Dinero apostado: 25% de peso** (secundario y normalizado)

Esto significa que los votos tienen **3 veces más importancia** que el dinero apostado.

### 2. **Normalización del Dinero Apostado**

Se usa **logaritmo** para reducir el impacto de grandes apuestas individuales:

```javascript
normalizedBetRatio = log10(betRatio * 9 + 1) / log10(10)
```

**Ejemplo:**
- Apuesta de $1000 tiene impacto similar a $100
- Apuesta de $100 tiene impacto similar a $10
- Esto previene que una sola apuesta grande distorsione las odds

### 3. **Factor de Diversidad de Apostadores**

Se considera la cantidad de **apostadores únicos**, no solo el monto total:

```javascript
bettorDiversity = apostadoresÚnicosDelParticipante / totalApostadoresÚnicos
```

**Beneficio:**
- Si 1 persona apuesta $1000 → impacto reducido
- Si 10 personas apuestan $100 cada una → impacto normal
- Esto premia la legitimidad sobre la concentración

### 4. **Factor de Concentración**

Si mucho dinero viene de pocos apostadores, se reduce su impacto:

```javascript
concentrationFactor = promedioGeneral / promedioDelParticipante
```

**Ejemplo:**
- Promedio general: $50 por apostador
- Participante X: $500 por apostador (10x más)
- Impacto reducido automáticamente

### 5. **Límite Máximo de Apuesta por Usuario**

El admin puede configurar un límite máximo que cada usuario puede apostar en total por evento:

- **0 = Sin límite** (por defecto)
- **>0 = Límite máximo** (ej: $500 por usuario)

**Uso:**
- Para eventos pequeños: límite bajo ($100-$500)
- Para eventos grandes: límite alto o sin límite
- Previene que un usuario manipule las odds con una sola apuesta grande

## Fórmula Final de Odds

```javascript
popularityScore = (voteRatio * 0.75) + (adjustedBetRatio * 0.25)

donde:
- voteRatio = votos del participante / total votos
- adjustedBetRatio = normalizedBetRatio * bettorDiversity * concentrationFactor
```

## Recomendaciones de Uso

### Para Eventos Pequeños (< 20 participantes):
- **Límite máximo:** $100 - $500 por usuario
- **Comisión casa:** 10-15%
- Esto previene manipulación en eventos pequeños

### Para Eventos Grandes (> 20 participantes):
- **Límite máximo:** $500 - $2000 o sin límite
- **Comisión casa:** 10%
- La diversidad natural protege contra manipulación

### Para Eventos de Alto Riesgo:
- **Límite máximo:** $50 - $200 por usuario
- **Comisión casa:** 15-20%
- Monitorear patrones sospechosos manualmente

## Monitoreo de Manipulación

El sistema ahora retorna información adicional para debugging:

```javascript
{
  odds: 2.5,
  payoutMultiplier: 2.25,
  uniqueBettors: 5,        // Cantidad de apostadores únicos
  bettorDiversity: 0.33    // Diversidad (0-1, más alto = más legítimo)
}
```

**Señales de posible manipulación:**
- `bettorDiversity < 0.2` → Muy pocos apostadores
- `uniqueBettors = 1` y `participantBetAmount` alto → Sospechoso
- `participantVotes = 0` pero `participantBetAmount` muy alto → Posible manipulación

## Ventajas del Sistema

✅ **Los votos tienen 3x más peso** que el dinero
✅ **Grandes apuestas individuales tienen impacto reducido** (logaritmo)
✅ **Se premia la diversidad** de apostadores
✅ **Se penaliza la concentración** de dinero en pocas manos
✅ **Límite configurable** por evento para protección adicional
✅ **Transparente** - toda la información está disponible para análisis

## Ejemplo Práctico

**Escenario:** 15 participantes, 1 es amigo de muchos

**Sin protección:**
- Participante X: 0 votos, $2000 apostados (de 2 amigos)
- Odds: 3.5x (muy altas, paga mucho)

**Con protección:**
- Participante X: 0 votos, $2000 apostados (de 2 amigos)
- Normalización: $2000 → impacto como $200
- Diversidad: 2/15 = 0.13 (baja)
- Concentración: Penalizada
- Odds: 2.0x (más razonables)

**Resultado:** Las odds reflejan mejor la realidad y son más difíciles de manipular.
