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

### 2. **Sistema Adaptado para Dinero Ficticio**

Como el dinero es ficticio (de un juego), las grandes apuestas son normales y esperadas:
- **No se penaliza** el monto individual de las apuestas
- Se permite que $100k tenga el mismo impacto proporcional que $100
- La protección viene de la **diversidad de apostadores**, no del monto

**Ejemplo:**
- 1 persona apuesta $100k → Impacto normal si es proporcional
- 10 personas apuestan $10k cada una → Impacto normal (más legítimo)
- 1 persona apuesta $100k cuando el promedio es $1k → Solo se penaliza si hay concentración extrema

### 3. **Factor de Diversidad de Apostadores**

Se considera la cantidad de **apostadores únicos**, no solo el monto total:

```javascript
bettorDiversity = apostadoresÚnicosDelParticipante / totalApostadoresÚnicos
```

**Beneficio:**
- Si 1 persona apuesta $1000 → impacto reducido
- Si 10 personas apuestan $100 cada una → impacto normal
- Esto premia la legitimidad sobre la concentración

### 4. **Factor de Concentración Suave**

Solo se penaliza en casos **EXTREMOS** de manipulación:

```javascript
// Solo penaliza si:
// - Hay 1-2 apostadores únicos
// - Y su promedio es más de 10x el promedio general
concentrationFactor = reducción solo en casos extremos
```

**Ejemplo:**
- Promedio general: $1k por apostador
- Participante X: $100k de 1 solo apostador (100x más) → Penalizado
- Participante Y: $50k de 5 apostadores (10x más cada uno) → NO penalizado (legítimo)
- Participante Z: $10k de 1 apostador cuando promedio es $5k → NO penalizado (normal en dinero ficticio)

### 5. **Límite Máximo de Apuesta por Usuario**

El admin puede configurar un límite máximo que cada usuario puede apostar en total por evento:

- **0 = Sin límite** (por defecto)
- **>0 = Límite máximo** (ej: $500 por usuario)

**Uso:**
- Para eventos pequeños: límite bajo ($100-$500)
- Para eventos grandes: límite alto o sin límite
- Previene que un usuario manipule las odds con una sola apuesta grande

## Fórmula Final de Odds (Adaptada para Dinero Ficticio)

```javascript
popularityScore = (voteRatio * 0.75) + (adjustedBetRatio * 0.25)

donde:
- voteRatio = votos del participante / total votos
- adjustedBetRatio = betRatio * bettorDiversity * concentrationFactor
- betRatio = dinero apostado por participante / total dinero apostado (sin normalización logarítmica)
- bettorDiversity = apostadores únicos del participante / total apostadores únicos
- concentrationFactor = 1 (normal) o <1 (solo en casos extremos de manipulación)
```

**Diferencias clave:**
- ✅ **No se usa logaritmo** - las grandes apuestas tienen impacto proporcional
- ✅ **Se premia la diversidad** - más apostadores = más legítimo
- ✅ **Solo se penaliza concentración extrema** - cuando 1-2 personas tienen 10x+ el promedio

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
- Participante X: 0 votos, $200k apostados (de 2 amigos)
- Odds: 3.5x (muy altas, paga mucho)

**Con protección (dinero ficticio):**
- Participante X: 0 votos, $200k apostados (de 2 amigos)
- Sin normalización: $200k tiene impacto proporcional
- Diversidad: 2/15 = 0.13 (baja, reduce impacto)
- Concentración: Si promedio es $10k y ellos tienen $100k cada uno → Penalizada suavemente
- Odds: 2.2x (más razonables, pero no tan restrictivas)

**Escenario legítimo (dinero ficticio):**
- Participante Y: 5 votos, $500k apostados (de 20 apostadores diferentes)
- Diversidad: 20/50 = 0.4 (buena)
- Concentración: Promedio $25k por apostador (normal)
- Odds: Reflejan correctamente la popularidad y apoyo legítimo

**Resultado:** Las odds reflejan mejor la realidad y son más difíciles de manipular.
