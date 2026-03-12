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

    // Fórmula de odds: 
    // - Menos votos pero más apuestas = odds más altas
    // - Más votos pero menos apuestas = odds más bajas
    const voteRatio = totalVotes > 0 ? participantVotes / totalVotes : 0.5;
    const betRatio = participantBetAmount / totalBetAmount;

    // Calcular odds inversas (menos popular = más paga)
    // Si tiene pocos votos pero muchas apuestas, paga más
    const popularityScore = voteRatio * 0.6 + betRatio * 0.4;
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
      totalVotes
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
