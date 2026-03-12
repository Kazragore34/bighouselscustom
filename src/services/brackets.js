import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { getVotesByEvent } from './votes';
import { getBetsByEvent } from './bets';

// Crear bracket
export const createBracket = async (bracketData) => {
  try {
    const bracketsRef = collection(db, 'brackets');
    const newBracketRef = doc(bracketsRef);
    
    await setDoc(newBracketRef, {
      ...bracketData,
      createdAt: new Date()
    });

    return newBracketRef.id;
  } catch (error) {
    throw error;
  }
};

// Obtener brackets de un evento
export const getBracketsByEvent = async (eventId) => {
  try {
    const bracketsRef = collection(db, 'brackets');
    // Intentar con orderBy primero, si falla (por falta de índice), intentar sin orderBy
    let querySnapshot;
    try {
      const q = query(
        bracketsRef,
        where('eventId', '==', eventId),
        orderBy('round', 'asc')
      );
      querySnapshot = await getDocs(q);
    } catch (orderByError) {
      // Si falla por falta de índice, intentar sin orderBy y ordenar en memoria
      console.warn('Error con orderBy, ordenando en memoria:', orderByError);
      const q = query(
        bracketsRef,
        where('eventId', '==', eventId)
      );
      querySnapshot = await getDocs(q);
    }
    
    const brackets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en memoria por round si no se pudo hacer con orderBy
    brackets.sort((a, b) => (a.round || 0) - (b.round || 0));
    
    return brackets;
  } catch (error) {
    console.error('Error en getBracketsByEvent:', error);
    throw error;
  }
};

// Actualizar bracket
export const updateBracket = async (bracketId, updates) => {
  try {
    const bracketRef = doc(db, 'brackets', bracketId);
    await updateDoc(bracketRef, updates);
    return true;
  } catch (error) {
    throw error;
  }
};

// Generar brackets inteligentes
export const generateSmartBrackets = async (eventId, participants, bracketType, participantsPerBracket) => {
  try {
    // Obtener votos y apuestas para detectar favoritos
    const votes = await getVotesByEvent(eventId);
    const bets = await getBetsByEvent(eventId);

    // Calcular score de favoritos (combinación de votos y apuestas)
    const favoriteScores = {};
    
    participants.forEach(participant => {
      const voteCount = votes.filter(v => v.favoriteId === participant.userId).length;
      const betAmount = bets
        .filter(b => b.participantId === participant.userId && b.status === 'confirmed')
        .reduce((sum, bet) => sum + bet.amount, 0);
      
      // Score = votos * 1 + apuestas * 0.1 (ajustable)
      favoriteScores[participant.userId] = voteCount + (betAmount * 0.1);
    });

    // Ordenar participantes por score (mayor a menor)
    const sortedParticipants = [...participants].sort((a, b) => {
      return (favoriteScores[b.userId] || 0) - (favoriteScores[a.userId] || 0);
    });

    // Identificar top favoritos (20% superior)
    const topFavoritesCount = Math.max(2, Math.floor(sortedParticipants.length * 0.2));
    const topFavorites = sortedParticipants.slice(0, topFavoritesCount);
    const restParticipants = sortedParticipants.slice(topFavoritesCount);

    // Mezclar aleatoriamente el resto
    const shuffledRest = [...restParticipants].sort(() => Math.random() - 0.5);

    // Distribuir favoritos en extremos opuestos
    const bracketSize = participantsPerBracket || 2;
    const totalBrackets = Math.ceil(participants.length / bracketSize);
    const brackets = [];

    // Crear estructura de brackets
    let participantIndex = 0;
    let favoriteIndex = 0;

    for (let i = 0; i < totalBrackets; i++) {
      const bracket = [];
      
      for (let j = 0; j < bracketSize; j++) {
        if (participantIndex < participants.length) {
          // Si es el primer o último bracket, poner favoritos
          if ((i === 0 || i === totalBrackets - 1) && favoriteIndex < topFavorites.length) {
            bracket.push(topFavorites[favoriteIndex].userId);
            favoriteIndex++;
          } else {
            // Usar participantes del resto mezclado
            const restIndex = participantIndex - favoriteIndex;
            if (restIndex < shuffledRest.length) {
              bracket.push(shuffledRest[restIndex].userId);
            } else if (favoriteIndex < topFavorites.length) {
              bracket.push(topFavorites[favoriteIndex].userId);
              favoriteIndex++;
            }
          }
          participantIndex++;
        }
      }
      
      if (bracket.length > 0) {
        brackets.push({
          participants: bracket,
          winnerId: null,
          status: 'pending'
        });
      }
    }

    // Crear el bracket en Firestore
    const bracketData = {
      eventId,
      round: 1,
      matches: brackets,
      isFinal: totalBrackets === 1
    };

    return await createBracket(bracketData);
  } catch (error) {
    throw error;
  }
};

// Actualizar ganador de un match
export const updateMatchWinner = async (bracketId, matchId, winnerId) => {
  try {
    const bracketRef = doc(db, 'brackets', bracketId);
    const bracketSnap = await getDoc(bracketRef);
    
    if (!bracketSnap.exists()) {
      throw new Error('Bracket no encontrado');
    }

    const bracketData = bracketSnap.data();
    const matches = bracketData.matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          winnerId,
          status: 'completed'
        };
      }
      return match;
    });

    await updateDoc(bracketRef, { matches });
    return true;
  } catch (error) {
    throw error;
  }
};
