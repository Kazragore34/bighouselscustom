import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Crear apuesta
export const createBet = async (eventId, userId, participantId, amount) => {
  try {
    // Verificar que el usuario no haya apostado ya por este participante en este evento
    const betsRef = collection(db, 'bets');
    const q = query(
      betsRef,
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      where('participantId', '==', participantId)
    );
    const existingBets = await getDocs(q);

    if (!existingBets.empty) {
      throw new Error('Ya has apostado por este participante en este evento');
    }

    // Crear la apuesta con estado pendiente
    const newBetRef = doc(collection(db, 'bets'));
    await setDoc(newBetRef, {
      eventId,
      userId,
      participantId,
      amount: parseFloat(amount),
      status: 'pending',
      createdAt: serverTimestamp(),
      confirmedBy: null,
      confirmedAt: null
    });

    return newBetRef.id;
  } catch (error) {
    throw error;
  }
};

// Obtener apuestas por evento
export const getBetsByEvent = async (eventId) => {
  try {
    const betsRef = collection(db, 'bets');
    const q = query(
      betsRef,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener apuestas pendientes
export const getPendingBets = async () => {
  try {
    const betsRef = collection(db, 'bets');
    const q = query(
      betsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Confirmar apuesta (admin)
export const confirmBet = async (betId, adminUserId) => {
  try {
    const betRef = doc(db, 'bets', betId);
    await updateDoc(betRef, {
      status: 'confirmed',
      confirmedBy: adminUserId,
      confirmedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    throw error;
  }
};

// Obtener apuestas por usuario
export const getBetsByUser = async (userId) => {
  try {
    const betsRef = collection(db, 'bets');
    const q = query(
      betsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener total apostado por participante en un evento
export const getTotalBetByParticipant = async (eventId, participantId) => {
  try {
    const bets = await getBetsByEvent(eventId);
    return bets
      .filter(bet => bet.participantId === participantId && bet.status === 'confirmed')
      .reduce((total, bet) => total + bet.amount, 0);
  } catch (error) {
    throw error;
  }
};
