import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Crear voto
export const createVote = async (eventId, userId, favoriteId) => {
  try {
    // Verificar si el usuario ya votó en este evento
    const votesRef = collection(db, 'votes');
    const q = query(
      votesRef,
      where('eventId', '==', eventId),
      where('userId', '==', userId)
    );
    const existingVotes = await getDocs(q);

    if (!existingVotes.empty) {
      throw new Error('Ya has votado en este evento');
    }

    // Crear el voto
    const newVoteRef = doc(collection(db, 'votes'));
    await setDoc(newVoteRef, {
      eventId,
      userId,
      favoriteId,
      createdAt: serverTimestamp()
    });

    return newVoteRef.id;
  } catch (error) {
    throw error;
  }
};

// Obtener votos por evento
export const getVotesByEvent = async (eventId) => {
  try {
    const votesRef = collection(db, 'votes');
    const q = query(votesRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener votos por usuario
export const getVotesByUser = async (userId) => {
  try {
    const votesRef = collection(db, 'votes');
    const q = query(votesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener conteo de votos por participante en un evento
export const getVoteCountsByEvent = async (eventId) => {
  try {
    const votes = await getVotesByEvent(eventId);
    const voteCounts = {};

    votes.forEach(vote => {
      if (!voteCounts[vote.favoriteId]) {
        voteCounts[vote.favoriteId] = 0;
      }
      voteCounts[vote.favoriteId]++;
    });

    return voteCounts;
  } catch (error) {
    throw error;
  }
};

// Verificar si usuario ya votó
export const hasUserVoted = async (eventId, userId) => {
  try {
    const votesRef = collection(db, 'votes');
    const q = query(
      votesRef,
      where('eventId', '==', eventId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    throw error;
  }
};
