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
    // NO usar orderBy para evitar necesidad de índice compuesto
    // Ordenar siempre en memoria
    const q = query(
      bracketsRef,
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);
    
    const brackets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en memoria por round (ascendente)
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

// Generar brackets inteligentes con múltiples rondas
export const generateSmartBrackets = async (eventId, participants, bracketType, participantsPerBracket) => {
  try {
    console.log('generateSmartBrackets iniciado:', { eventId, participantsCount: participants.length, bracketType, participantsPerBracket });
    
    // Validar que hay participantes
    if (!participants || participants.length === 0) {
      throw new Error('No hay participantes para generar brackets');
    }
    
    // Obtener votos y apuestas para detectar favoritos
    console.log('Obteniendo votos y apuestas...');
    const [votes, bets] = await Promise.all([
      getVotesByEvent(eventId).catch(err => {
        console.warn('Error obteniendo votos, usando array vacío:', err);
        return [];
      }),
      getBetsByEvent(eventId).catch(err => {
        console.warn('Error obteniendo apuestas, usando array vacío:', err);
        return [];
      })
    ]);
    
    console.log('Votos obtenidos:', votes.length, 'Apuestas obtenidas:', bets.length);

    // Calcular score de favoritos (combinación de votos y apuestas)
    const favoriteScores = {};
    
    participants.forEach(participant => {
      const participantId = participant.userId || participant.teamId || participant.id;
      const voteCount = votes.filter(v => v.favoriteId === participantId).length;
      const betAmount = bets
        .filter(b => (b.participantId === participantId || b.teamId === participantId) && b.status === 'confirmed')
        .reduce((sum, bet) => sum + bet.amount, 0);
      
      // Score = votos * 1 + apuestas * 0.1 (ajustable)
      favoriteScores[participantId] = voteCount + (betAmount * 0.1);
    });

    // Ordenar participantes por score (mayor a menor)
    const sortedParticipants = [...participants].sort((a, b) => {
      const aId = a.userId || a.teamId || a.id;
      const bId = b.userId || b.teamId || b.id;
      return (favoriteScores[bId] || 0) - (favoriteScores[aId] || 0);
    });

    // Identificar top favoritos (20% superior)
    const topFavoritesCount = Math.max(2, Math.floor(sortedParticipants.length * 0.2));
    const topFavorites = sortedParticipants.slice(0, topFavoritesCount);
    const restParticipants = sortedParticipants.slice(topFavoritesCount);

    // Mezclar aleatoriamente el resto
    const shuffledRest = [...restParticipants].sort(() => Math.random() - 0.5);

    // Generar todas las rondas del torneo
    const allRounds = generateTournamentRounds(
      sortedParticipants,
      bracketType,
      participantsPerBracket,
      topFavorites,
      shuffledRest
    );

    // Validar que se generaron rondas
    if (!allRounds || allRounds.length === 0) {
      throw new Error('No se pudieron generar rondas para los brackets');
    }
    
    console.log('Rondas generadas:', allRounds.length);
    
    // Eliminar brackets existentes antes de crear nuevos
    console.log('Eliminando brackets existentes...');
    try {
      const existingBrackets = await getBracketsByEvent(eventId);
      const deletePromises = existingBrackets.map(bracket => {
        const bracketRef = doc(db, 'brackets', bracket.id);
        return deleteDoc(bracketRef).catch(err => {
          console.warn('Error eliminando bracket existente:', bracket.id, err);
        });
      });
      await Promise.all(deletePromises);
      console.log('Brackets existentes eliminados');
    } catch (deleteError) {
      console.warn('Error eliminando brackets existentes, continuando:', deleteError);
    }
    
    // Guardar cada ronda en Firestore
    console.log('Guardando brackets en Firestore...');
    const bracketIds = [];
    for (let i = 0; i < allRounds.length; i++) {
      const roundData = {
        eventId,
        round: i + 1,
        matches: allRounds[i],
        isFinal: i === allRounds.length - 1
      };
      console.log(`Guardando ronda ${i + 1}/${allRounds.length}...`);
      const bracketId = await createBracket(roundData);
      bracketIds.push(bracketId);
      console.log(`Ronda ${i + 1} guardada con ID:`, bracketId);
    }

    console.log('Brackets generados exitosamente, IDs:', bracketIds);
    return bracketIds[0]; // Retornar ID de la primera ronda
  } catch (error) {
    console.error('Error completo en generateSmartBrackets:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Generar todas las rondas del torneo
const generateTournamentRounds = (participants, bracketType, participantsPerBracket, topFavorites, shuffledRest) => {
  const rounds = [];
  let currentRoundParticipants = [...participants];
  const bracketSize = participantsPerBracket || 2;

  // Lógica especial para carreras con muchos participantes
  if (bracketType === '10x10' || bracketType === 'custom') {
    return generateRaceBrackets(participants, bracketSize);
  }

  // Para 1v1 y 2v2: eliminación directa
  let roundNumber = 1;
  
  while (currentRoundParticipants.length > 1) {
    const matches = [];
    const nextRoundParticipants = [];

    // Mezclar participantes para esta ronda (excepto primera ronda donde distribuimos favoritos)
    let participantsForRound = roundNumber === 1
      ? distributeFavorites(currentRoundParticipants, topFavorites, shuffledRest, bracketSize)
      : [...currentRoundParticipants].sort(() => Math.random() - 0.5);

    // Crear matches de esta ronda
    for (let i = 0; i < participantsForRound.length; i += bracketSize) {
      const matchParticipants = participantsForRound.slice(i, i + bracketSize);
      
      if (matchParticipants.length > 0) {
        const matchId = `match-${roundNumber}-${matches.length + 1}`;
        matches.push({
          id: matchId,
          participants: matchParticipants.map(p => p.userId || p.teamId || p.id),
          winnerId: null,
          status: 'pending'
        });
      }
    }

    rounds.push(matches);
    
    // Para la siguiente ronda, cada match tendrá un ganador (por ahora null)
    // En la práctica, el admin establecerá los ganadores y se generará la siguiente ronda
    if (matches.length <= 1) break; // Si solo queda un match, es la final
    
    // No crear participantes "pending" - la siguiente ronda se generará cuando se establezcan ganadores
    // Por ahora, solo avanzar al siguiente roundNumber
    roundNumber++;
    
    // Si no hay más participantes para la siguiente ronda, terminar
    if (matches.length === 0) break;
  }

  return rounds;
};

// Distribuir favoritos en extremos opuestos (solo primera ronda)
const distributeFavorites = (participants, topFavorites, shuffledRest, bracketSize) => {
  const result = [];
  const totalBrackets = Math.ceil(participants.length / bracketSize);
  
  let favoriteIndex = 0;
  let restIndex = 0;
  let participantIndex = 0;

  for (let i = 0; i < totalBrackets; i++) {
    const bracket = [];
    
    for (let j = 0; j < bracketSize && participantIndex < participants.length; j++) {
      // Si es el primer o último bracket, poner favoritos
      if ((i === 0 || i === totalBrackets - 1) && favoriteIndex < topFavorites.length) {
        bracket.push(topFavorites[favoriteIndex]);
        favoriteIndex++;
      } else {
        // Usar participantes del resto mezclado
        if (restIndex < shuffledRest.length) {
          bracket.push(shuffledRest[restIndex]);
          restIndex++;
        } else if (favoriteIndex < topFavorites.length) {
          bracket.push(topFavorites[favoriteIndex]);
          favoriteIndex++;
        }
      }
      participantIndex++;
    }
    
    result.push(...bracket);
  }

  return result;
};

// Generar brackets para carreras con grupos
const generateRaceBrackets = (participants, maxPerGroup) => {
  const rounds = [];
  const totalParticipants = participants.length;
  
  // Primera ronda: dividir en grupos
  const groups = [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length; i += maxPerGroup) {
    const group = shuffled.slice(i, i + maxPerGroup);
    groups.push(group);
  }

  // Crear matches para cada grupo (cada grupo es un "match" con múltiples participantes)
  const firstRoundMatches = groups.map((group, index) => ({
    id: `group-${index + 1}`,
    participants: group.map(p => p.userId || p.teamId || p.id),
    winnerId: null,
    status: 'pending',
    isGroup: true // Indica que es un grupo, no un match 1v1
  }));

  rounds.push(firstRoundMatches);

  // NOTA: La final se generará automáticamente cuando todos los grupos tengan ganadores
  // mediante updateMatchWinner, no aquí

  return rounds;
};

// Generar preview de brackets basado en participantes (sin guardar en Firestore)
export const generatePreviewBrackets = (participants, bracketType = '1v1', participantsPerBracket = 2) => {
  if (!participants || participants.length === 0) {
    return [];
  }

  const bracketSize = participantsPerBracket || 2;
  
  // Lógica especial para carreras con grupos
  if (bracketType === '10x10' || bracketType === 'custom') {
    return generateRaceBracketsPreview(participants, bracketSize);
  }

  // Para 1v1 y 2v2: generar múltiples rondas
  const rounds = [];
  let currentRoundParticipants = [...participants];
  let roundNumber = 1;

  while (currentRoundParticipants.length > 1) {
    const matches = [];
    const shuffled = [...currentRoundParticipants].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += bracketSize) {
      const matchParticipants = shuffled.slice(i, i + bracketSize);
      
      if (matchParticipants.length > 0) {
        matches.push({
          id: `preview-match-${roundNumber}-${matches.length + 1}`,
          participants: matchParticipants.map(p => p.userId || p.teamId || p.id),
          winnerId: null,
          status: 'pending'
        });
      }
    }

    rounds.push({
      round: roundNumber,
      matches,
      isFinal: matches.length === 1
    });

    // Para la siguiente ronda, simular que avanzan los ganadores
    if (matches.length <= 1) break;
    // No crear participantes "pending", solo avanzar si hay ganadores reales
    currentRoundParticipants = [];
    roundNumber++;
  }

  return rounds;
};

// Generar preview de brackets para carreras con grupos
const generateRaceBracketsPreview = (participants, maxPerGroup) => {
  const rounds = [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  
  // Primera ronda: grupos
  const groups = [];
  for (let i = 0; i < shuffled.length; i += maxPerGroup) {
    const group = shuffled.slice(i, i + maxPerGroup);
    groups.push(group);
  }

  const firstRoundMatches = groups.map((group, index) => ({
    id: `preview-group-${index + 1}`,
    participants: group.map(p => p.userId || p.teamId || p.id),
    winnerId: null,
    status: 'pending',
    isGroup: true
  }));

  rounds.push({
    round: 1,
    matches: firstRoundMatches,
    isFinal: false
  });

  // Segunda ronda: final
  if (groups.length > 1) {
    rounds.push({
      round: 2,
      matches: [{
        id: 'preview-final',
        participants: groups.map((_, index) => `winner-group-${index + 1}`),
        winnerId: null,
        status: 'pending',
        isFinal: true
      }],
      isFinal: true
    });
  }

  return rounds;
};

// Actualizar ganador de un match y generar siguiente ronda si es necesario
export const updateMatchWinner = async (bracketId, matchId, winnerId, eventId) => {
  try {
    const bracketRef = doc(db, 'brackets', bracketId);
    const bracketSnap = await getDoc(bracketRef);
    
    if (!bracketSnap.exists()) {
      throw new Error('Bracket no encontrado');
    }

    const bracketData = bracketSnap.data();
    const currentRound = bracketData.round;
    
    // Actualizar el match con el ganador
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

    // Verificar si todos los matches de esta ronda están completados
    const allCompleted = matches.every(m => m.status === 'completed' && m.winnerId);
    
    if (allCompleted && matches.length > 1) {
      // Generar siguiente ronda automáticamente
      const winners = matches.map(m => m.winnerId).filter(Boolean);
      
      // Obtener datos del evento para saber el tipo de bracket
      const { getEventById } = await import('./events');
      const event = await getEventById(eventId);
      const bracketType = event.bracketType || '1v1';
      const participantsPerBracket = event.participantsPerBracket || 2;

      // Crear matches para la siguiente ronda
      const nextRoundMatches = [];
      
      // Verificar si la ronda actual tiene grupos (isGroup)
      const isGroupRound = matches.some(m => m.isGroup);
      
      if (isGroupRound && winners.length > 1) {
        // Si es una ronda de grupos completada, crear la final con todos los ganadores
        nextRoundMatches.push({
          id: `final-${currentRound + 1}`,
          participants: winners,
          winnerId: null,
          status: 'pending',
          isFinal: true
        });
      } else {
        // Si es una ronda normal, crear matches normales
        for (let i = 0; i < winners.length; i += participantsPerBracket) {
          const matchParticipants = winners.slice(i, i + participantsPerBracket);
          if (matchParticipants.length > 0) {
            nextRoundMatches.push({
              id: `match-${currentRound + 1}-${nextRoundMatches.length + 1}`,
              participants: matchParticipants,
              winnerId: null,
              status: 'pending'
            });
          }
        }
      }

      // Crear la siguiente ronda
      if (nextRoundMatches.length > 0) {
        const nextRoundData = {
          eventId,
          round: currentRound + 1,
          matches: nextRoundMatches,
          isFinal: nextRoundMatches.length === 1
        };
        
        await createBracket(nextRoundData);
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
};
