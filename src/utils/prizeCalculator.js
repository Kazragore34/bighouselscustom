import { getVotesByEvent } from '../services/votes';
import { getBetsByEvent } from '../services/bets';
import { getEventById } from '../services/events';

// Calcular odds dinámicas para un participante
export const calculateOdds = async (eventId, participantId) => {
  try {
    // Cargar datos en paralelo para mejor rendimiento
    const [event, votes, bets] = await Promise.all([
      getEventById(eventId),
      getVotesByEvent(eventId),
      getBetsByEvent(eventId)
    ]);

    // Filtrar solo apuestas confirmadas
    const confirmedBets = bets.filter(bet => bet.status === 'confirmed');

    // Calcular total apostado
    const totalBetAmount = confirmedBets.reduce((sum, bet) => sum + bet.amount, 0);

    // Calcular monto apostado por este participante
    const participantBetAmount = confirmedBets
      .filter(bet => bet.participantId === participantId)
      .reduce((sum, bet) => sum + bet.amount, 0);

    // Si no hay apuestas, retornar odds neutras
    if (totalBetAmount === 0 || participantBetAmount === 0) {
      return {
        odds: 1.0,
        payoutMultiplier: 1.0
      };
    }

    // Calcular votos del participante
    // IMPORTANTE: Asegurar que todos los participantes tengan al menos 1 voto invisible
    // para que los odds se calculen correctamente incluso con 0 votos reales
    const participantVotes = votes.filter(vote => vote.favoriteId === participantId).length;
    
    // Obtener todos los participantes del evento para asegurar que todos tengan mínimo 1 voto
    // Obtener participantes solo si es necesario (para calcular totalParticipants)
    const { getEventParticipants } = await import('../services/events');
    let totalParticipants = 1; // Default mínimo
    try {
      const eventParticipants = await getEventParticipants(eventId);
      totalParticipants = eventParticipants.length || 1;
    } catch (error) {
      // Si falla, usar los votos para contar participantes únicos
      const uniqueParticipants = new Set(votes.map(v => v.favoriteId));
      totalParticipants = uniqueParticipants.size || 1;
    }
    
    // Total de votos = votos reales + 1 voto invisible por cada participante sin votos
    // Esto asegura que todos los participantes cuenten para el cálculo de odds
    const participantsWithVotes = new Set(votes.map(v => v.favoriteId));
    const participantsWithoutVotes = totalParticipants - participantsWithVotes.size;
    const totalVotes = votes.length + participantsWithoutVotes; // Votos reales + votos invisibles
    
    // Votos del participante: votos reales + 1 voto invisible si no tiene votos reales
    const effectiveParticipantVotes = participantVotes > 0 ? participantVotes : 1;
    
    // Calcular ratio de votos (peso principal: 75%)
    // IMPORTANTE: Si todos tienen la misma apuesta, los votos deben tener MÁS peso
    const voteRatio = totalVotes > 0 ? effectiveParticipantVotes / totalVotes : 1 / totalParticipants;

    // Calcular ratio de dinero apostado (peso secundario: 25%)
    const betRatio = totalBetAmount > 0 ? participantBetAmount / totalBetAmount : 0;
    
    // Si todos tienen la misma apuesta, el betRatio no diferencia, así que aumentamos el peso de los votos
    // Detectar si todas las apuestas son iguales
    const allBetAmounts = confirmedBets.map(bet => bet.amount);
    const uniqueBetAmounts = new Set(allBetAmounts);
    const allSameBet = uniqueBetAmounts.size === 1 && allBetAmounts.length > 1;
    
    // Si todas las apuestas son iguales, dar más peso a los votos (90% votos, 10% dinero)
    // Si hay diferencias en apuestas, usar la distribución normal (75% votos, 25% dinero)
    const voteWeight = allSameBet ? 0.90 : 0.75;
    const betWeight = allSameBet ? 0.10 : 0.25;

    // MEDIDAS ANTI-MANIPULACIÓN (Adaptadas para dinero ficticio de juego):
    
    // 1. Considerar cantidad de apostadores únicos (más apostadores = más legítimo)
    // Esto es más importante que el monto individual en dinero ficticio
    const uniqueBettors = new Set(
      confirmedBets
        .filter(bet => bet.participantId === participantId)
        .map(bet => bet.userId)
    ).size;
    const totalUniqueBettors = new Set(confirmedBets.map(bet => bet.userId)).size;
    const bettorDiversity = totalUniqueBettors > 0 ? uniqueBettors / totalUniqueBettors : 0;

    // 2. Factor de concentración suave (solo penaliza casos extremos)
    // En dinero ficticio, es normal que haya grandes diferencias, pero si TODO viene de 1-2 personas, es sospechoso
    const participantBets = confirmedBets.filter(bet => bet.participantId === participantId);
    const avgBetPerBettor = uniqueBettors > 0 ? participantBetAmount / uniqueBettors : 0;
    const totalAvgBetPerBettor = totalUniqueBettors > 0 ? totalBetAmount / totalUniqueBettors : 0;
    
    // Solo penalizar si la concentración es EXTREMA (más de 10x el promedio y pocos apostadores)
    let concentrationFactor = 1;
    if (totalAvgBetPerBettor > 0 && uniqueBettors > 0 && uniqueBettors <= 2) {
      const concentrationRatio = avgBetPerBettor / totalAvgBetPerBettor;
      // Solo reducir si es más de 10x el promedio Y hay 1-2 apostadores únicos
      if (concentrationRatio > 10) {
        concentrationFactor = Math.max(0.5, 10 / concentrationRatio); // Reducción suave
      }
    }

    // 3. Ajustar el betRatio con factores anti-manipulación
    // En dinero ficticio, el monto es menos importante que la diversidad de apostadores
    // Usamos betRatio directamente pero lo multiplicamos por diversidad y concentración
    const adjustedBetRatio = betRatio * bettorDiversity * concentrationFactor;

    // Fórmula mejorada: VOTOS tienen peso variable según si todas las apuestas son iguales
    // Si todas las apuestas son iguales: 90% votos, 10% dinero (los votos son más importantes)
    // Si hay diferencias en apuestas: 75% votos, 25% dinero (ajustado por diversidad)
    const popularityScore = voteRatio * voteWeight + adjustedBetRatio * betWeight;
    const inversePopularity = 1 - popularityScore;

    // Odds base (ajustable)
    const baseOdds = 1.5;
    const odds = baseOdds + (inversePopularity * 2);

    // Aplicar comisión de la casa
    const houseCommission = (event.houseCommission || 10) / 100;
    const payoutMultiplier = odds * (1 - houseCommission);

    return {
      odds: parseFloat(odds.toFixed(2)),
      payoutMultiplier: parseFloat(payoutMultiplier.toFixed(2)),
      totalBetAmount,
      participantBetAmount,
      participantVotes,
      totalVotes,
      uniqueBettors, // Para debugging/transparencia
      bettorDiversity: parseFloat(bettorDiversity.toFixed(2))
    };
  } catch (error) {
    throw error;
  }
};

// Calcular premio para un apostador ganador
export const calculatePrize = async (eventId, participantId, betAmount) => {
  try {
    const oddsData = await calculateOdds(eventId, participantId);
    const prize = betAmount * oddsData.payoutMultiplier;
    
    return {
      betAmount,
      odds: oddsData.odds,
      payoutMultiplier: oddsData.payoutMultiplier,
      prize: parseFloat(prize.toFixed(2)),
      profit: parseFloat((prize - betAmount).toFixed(2))
    };
  } catch (error) {
    throw error;
  }
};

// Obtener estadísticas de premios para todos los participantes
export const getPrizeStats = async (eventId) => {
  try {
    const event = await getEventById(eventId);
    const bets = await getBetsByEvent(eventId);
    const confirmedBets = bets.filter(bet => bet.status === 'confirmed');

    // Obtener participantes únicos
    const participantIds = [...new Set(confirmedBets.map(bet => bet.participantId))];

    const stats = await Promise.all(
      participantIds.map(async (participantId) => {
        const oddsData = await calculateOdds(eventId, participantId);
        const participantBets = confirmedBets.filter(bet => bet.participantId === participantId);
        const totalBetAmount = participantBets.reduce((sum, bet) => sum + bet.amount, 0);

        return {
          participantId,
          odds: oddsData.odds,
          payoutMultiplier: oddsData.payoutMultiplier,
          totalBetAmount,
          participantVotes: oddsData.participantVotes,
          totalVotes: oddsData.totalVotes
        };
      })
    );

    return stats.sort((a, b) => b.odds - a.odds); // Ordenar por odds descendente
  } catch (error) {
    throw error;
  }
};
