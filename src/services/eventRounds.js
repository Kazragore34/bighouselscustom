import {
  collection, doc, setDoc, updateDoc, getDocs,
  query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Obtener todas las rondas de un evento, ordenadas
export const getRoundsByEvent = async (eventId) => {
  try {
    const q = query(collection(db, 'eventRounds'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    const rounds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return rounds.sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
  } catch (error) {
    throw error;
  }
};

// Abrir una nueva ronda (crea el documento en Firestore)
export const openRound = async (eventId, roundNumber) => {
  try {
    const ref = doc(collection(db, 'eventRounds'));
    await setDoc(ref, {
      eventId,
      roundNumber,
      status: 'ABIERTA',
      openedAt: serverTimestamp(),
      closedAt: null,
      winnerId: null,
      winnerName: null,
      totalPool: 0,
      commissionAmount: 0,
      netPool: 0,
      resolvedAt: null,
    });
    return ref.id;
  } catch (error) {
    throw error;
  }
};

// Cerrar apuestas de una ronda (ya no se pueden apostar más)
export const closeRoundBetting = async (roundId) => {
  try {
    await updateDoc(doc(db, 'eventRounds', roundId), {
      status: 'CERRADA',
      closedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    throw error;
  }
};

// Resolver ronda — declara ganador, calcula pozo y notifica
export const resolveRound = async (roundId, eventId, winnerId, winnerName, commissionPercent = 10) => {
  try {
    // Calcular el pozo de esta ronda desde las apuestas confirmadas con roundNumber
    const { getBetsByEvent } = await import('./bets');
    const allBets = await getBetsByEvent(eventId);

    // Obtener el roundNumber de este round
    const roundSnap = await getDocs(
      query(collection(db, 'eventRounds'), where('eventId', '==', eventId))
    );
    const roundDoc = roundSnap.docs.find(d => d.id === roundId);
    const roundNumber = roundDoc?.data()?.roundNumber;

    // Apuestas confirmadas de esta ronda específica
    const roundBets = allBets.filter(
      b => b.status === 'confirmed' && b.roundNumber === roundNumber
    );

    const totalPool = roundBets.reduce((s, b) => s + (b.amount || 0), 0);
    const commissionAmount = totalPool * (commissionPercent / 100);
    const netPool = totalPool - commissionAmount;

    await updateDoc(doc(db, 'eventRounds', roundId), {
      status: 'RESUELTA',
      winnerId,
      winnerName,
      totalPool,
      commissionAmount,
      netPool,
      resolvedAt: serverTimestamp(),
    });

    // Notificar apostadores de esta ronda
    try {
      const { notifyBetWon, notifyBetLost } = await import('./notifications');
      await Promise.all(roundBets.map(async bet => {
        if (bet.participantId === winnerId) {
          await notifyBetWon(bet.userId, winnerName, '—', eventId, bet.id).catch(() => {});
        } else {
          await notifyBetLost(bet.userId, winnerName, eventId, bet.id).catch(() => {});
        }
      }));
    } catch (e) {
      console.warn('Error notificando resultado de ronda:', e);
    }

    return { totalPool, netPool, commissionAmount };
  } catch (error) {
    throw error;
  }
};
