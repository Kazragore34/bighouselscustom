import { getVotesByEvent } from '../services/votes';
import { getBetsByEvent } from '../services/bets';
import { getEventById } from '../services/events';

// Calcular odds dinámicas para un participante
export const calculateOdds = async (eventId, participantId) => {
  try {
    const event = await getEventById(eventId);
    const votes = await getVotesByEvent(eventId);
    const bets = await getBetsByEvent(eventId);

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
    const participantVotes = votes.filter(vote => vote.favoriteId === participantId).length;
    const totalVotes = votes.length;

    // Calcular ratio de votos (peso principal: 75%)
    const voteRatio = totalVotes > 0 ? participantVotes / totalVotes : 0.5;

    // Calcular ratio de dinero apostado (peso secundario: 25%)
    const betRatio = participantBetAmount / totalBetAmount;

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

    // Fórmula mejorada: VOTOS tienen 75% de peso, DINERO solo 25% (ajustado por diversidad)
    // En dinero ficticio, protegemos contra manipulación pero permitimos grandes apuestas legítimas
    const popularityScore = voteRatio * 0.75 + adjustedBetRatio * 0.25;
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
