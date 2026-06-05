/**
 * Sistema de apuestas PARIMUTUEL
 * ─────────────────────────────
 * El pozo total son TODAS las apuestas confirmadas del evento.
 * La casa retiene su comisión y el resto se reparte PROPORCIONAL
 * entre quienes apostaron al ganador.
 *
 * Fórmula:
 *   pozo_bruto   = Σ todas las apuestas confirmadas
 *   pozo_neto    = pozo_bruto × (1 - comisión%)
 *   tu_pago      = pozo_neto × (tu_apuesta / Σ apuestas_al_ganador)
 *
 * Esto garantiza que NUNCA se paga más de lo que hay en el pozo.
 */

import { getVotesByEvent } from '../services/votes';
import { getBetsByEvent } from '../services/bets';
import { getEventById } from '../services/events';

/**
 * Calcula odds visuales y pago estimado para un participante.
 * Los "odds" aquí son simplemente un indicador de popularidad
 * (más votos/apuestas = odds más bajas = favorito).
 */
export const calculateOdds = async (eventId, participantId) => {
  try {
    const [event, votes, bets] = await Promise.all([
      getEventById(eventId),
      getVotesByEvent(eventId),
      getBetsByEvent(eventId)
    ]);

    const commission = (event.commissionPercent || event.houseCommission || 10) / 100;
    const confirmedBets = bets.filter(b => b.status === 'confirmed');

    const totalPool = confirmedBets.reduce((s, b) => s + (b.amount || 0), 0);
    const netPool   = totalPool * (1 - commission);

    const participantBets = confirmedBets.filter(b => b.participantId === participantId);
    const participantPool = participantBets.reduce((s, b) => s + (b.amount || 0), 0);

    const participantVotes = votes.filter(v => v.favoriteId === participantId).length;
    const totalVotes = votes.length || 1;

    // Odds visuales (indicador): cuántos "rivales" hay en dinero/votos
    // Si todo el mundo apuesta a este → odds ~1.1 (casi seguro)
    // Si nadie apuesta a este → odds altos (arriesgado)
    let odds = 1.0;
    if (totalPool > 0 && participantPool > 0) {
      // Ratio inverso: si tienes el 50% del pool, odds ~2x; 10% → ~10x
      odds = Math.max(1.05, (netPool / participantPool));
      odds = parseFloat(Math.min(odds, 99).toFixed(2));
    } else {
      // Sin apuestas aún: odds basados solo en votos
      const voteShare = participantVotes / totalVotes;
      odds = voteShare > 0 ? Math.max(1.05, 1 / voteShare) : 5.0;
      odds = parseFloat(Math.min(odds, 99).toFixed(2));
    }

    // payoutMultiplier = si apuestas 1 unidad y gana, cobras X
    // = netPool / participantPool
    // (ya incluido en el cálculo de odds arriba cuando hay apuestas)
    const payoutMultiplier = participantPool > 0
      ? parseFloat((netPool / participantPool).toFixed(2))
      : odds;

    return {
      odds,
      payoutMultiplier,
      totalPool,
      netPool,
      participantPool,
      commission,
      participantVotes,
      totalVotes,
    };
  } catch (error) {
    return { odds: 1.0, payoutMultiplier: 1.0, totalPool: 0, netPool: 0, participantPool: 0 };
  }
};

/**
 * Calcula el pago estimado si apuestas `betAmount` en `participantId` AHORA.
 * Considera que tu apuesta SE SUMA al pozo (más preciso que el multiplicador estático).
 */
export const calculateEstimatedPayout = async (eventId, participantId, betAmount) => {
  try {
    const [event, bets] = await Promise.all([
      getEventById(eventId),
      getBetsByEvent(eventId)
    ]);

    const commission = (event.commissionPercent || event.houseCommission || 10) / 100;
    const confirmedBets = bets.filter(b => b.status === 'confirmed');

    const currentTotal = confirmedBets.reduce((s, b) => s + (b.amount || 0), 0);
    const currentParticipantPool = confirmedBets
      .filter(b => b.participantId === participantId)
      .reduce((s, b) => s + (b.amount || 0), 0);

    // Con tu apuesta añadida al pozo
    const newTotal = currentTotal + betAmount;
    const newParticipantPool = currentParticipantPool + betAmount;
    const newNetPool = newTotal * (1 - commission);

    const estimatedPayout = newNetPool * (betAmount / newParticipantPool);

    return {
      estimatedPayout: parseFloat(estimatedPayout.toFixed(0)),
      netPool: parseFloat(newNetPool.toFixed(0)),
      commission: parseFloat((newTotal * commission).toFixed(0)),
    };
  } catch {
    return { estimatedPayout: betAmount, netPool: betAmount, commission: 0 };
  }
};

/**
 * Calcula cuánto cobran los ganadores una vez terminado el evento.
 * Devuelve array { userId, betAmount, payout } para cada apostador ganador.
 */
export const calculateWinnerPayouts = (allConfirmedBets, winnerId, commissionPercent = 10) => {
  const commission = commissionPercent / 100;
  const totalPool = allConfirmedBets.reduce((s, b) => s + (b.amount || 0), 0);
  const netPool = totalPool * (1 - commission);

  const winnerBets = allConfirmedBets.filter(b => b.participantId === winnerId);
  const winnerPool = winnerBets.reduce((s, b) => s + (b.amount || 0), 0);

  if (winnerPool === 0) return [];

  return winnerBets.map(bet => ({
    userId: bet.userId,
    betId: bet.id,
    betAmount: bet.amount,
    payout: parseFloat((netPool * (bet.amount / winnerPool)).toFixed(0)),
  }));
};
