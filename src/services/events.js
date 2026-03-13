import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Crear evento
export const createEvent = async (eventData) => {
  try {
    const eventsRef = collection(db, 'events');
    const newEventRef = doc(eventsRef);
    
    // Limpiar campos undefined y null antes de enviar a Firestore
    const cleanData = Object.fromEntries(
      Object.entries({
        ...eventData,
        status: eventData.status || 'draft',
        createdAt: serverTimestamp(),
        startDate: eventData.startDate || null,
        endDate: eventData.endDate || null
      }).filter(([key, value]) => {
        // Eliminar bannerFile explícitamente y cualquier campo undefined
        return key !== 'bannerFile' && value !== undefined;
      })
    );
    
    await setDoc(newEventRef, cleanData);

    return newEventRef.id;
  } catch (error) {
    throw error;
  }
};

// Obtener todos los eventos
export const getAllEvents = async () => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener eventos activos
export const getActiveEvents = async () => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('status', '==', 'active'),
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

// Obtener evento por ID
export const getEventById = async (eventId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Evento no encontrado');
    }

    return {
      id: eventSnap.id,
      ...eventSnap.data()
    };
  } catch (error) {
    throw error;
  }
};

// Actualizar evento
export const updateEvent = async (eventId, updates) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    
    // Limpiar campos undefined y null antes de enviar a Firestore
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => {
        // Eliminar bannerFile explícitamente y cualquier campo undefined
        return key !== 'bannerFile' && value !== undefined;
      })
    );
    
    await updateDoc(eventRef, cleanUpdates);
    return true;
  } catch (error) {
    throw error;
  }
};

// Eliminar evento y datos relacionados
export const deleteEvent = async (eventId) => {
  try {
    // Primero eliminar datos relacionados (participantes, votos, apuestas, brackets)
    // Nota: Las reglas de Firestore pueden requerir permisos especiales para eliminar en cascada
    
    // Eliminar participantes del evento
    try {
      const participantsRef = collection(db, 'eventParticipants');
      const participantsQuery = query(participantsRef, where('eventId', '==', eventId));
      const participantsSnapshot = await getDocs(participantsQuery);
      const deleteParticipantsPromises = participantsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteParticipantsPromises);
    } catch (err) {
      console.warn('Error eliminando participantes (puede ser normal si no hay):', err);
    }

    // Eliminar votos del evento
    try {
      const votesRef = collection(db, 'votes');
      const votesQuery = query(votesRef, where('eventId', '==', eventId));
      const votesSnapshot = await getDocs(votesQuery);
      const deleteVotesPromises = votesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteVotesPromises);
    } catch (err) {
      console.warn('Error eliminando votos (puede ser normal si no hay):', err);
    }

    // Eliminar apuestas del evento
    try {
      const betsRef = collection(db, 'bets');
      const betsQuery = query(betsRef, where('eventId', '==', eventId));
      const betsSnapshot = await getDocs(betsQuery);
      const deleteBetsPromises = betsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteBetsPromises);
    } catch (err) {
      console.warn('Error eliminando apuestas (puede ser normal si no hay):', err);
    }

    // Eliminar brackets del evento
    try {
      const bracketsRef = collection(db, 'brackets');
      const bracketsQuery = query(bracketsRef, where('eventId', '==', eventId));
      const bracketsSnapshot = await getDocs(bracketsQuery);
      const deleteBracketsPromises = bracketsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteBracketsPromises);
    } catch (err) {
      console.warn('Error eliminando brackets (puede ser normal si no hay):', err);
    }

    // Finalmente eliminar el evento
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
    
    return true;
  } catch (error) {
    console.error('Error en deleteEvent:', error);
    throw new Error(error.message || 'No se pudo eliminar el evento. Verifica los permisos de Firestore.');
  }
};

// Agregar participantes a evento (individuales o por equipos)
export const addParticipantsToEvent = async (eventId, participants) => {
  try {
    console.log('addParticipantsToEvent llamado con:', { eventId, participants });
    
    if (!eventId || !participants || participants.length === 0) {
      console.warn('Datos inválidos para agregar participantes');
      return true;
    }

    // participants puede ser array de userIds o array de objetos {userId, teamId}
    const participantsArray = Array.isArray(participants) && participants.length > 0 && typeof participants[0] === 'string'
      ? participants.map(userId => ({ userId }))
      : participants;

    console.log('Participantes procesados:', participantsArray);

    const writePromises = participantsArray.map(async (participant) => {
      if (!participant.userId) {
        console.warn('Participante sin userId:', participant);
        return;
      }
      
      const participantRef = doc(collection(db, 'eventParticipants'));
      const data = {
        eventId,
        userId: participant.userId,
        teamId: participant.teamId || null,
        enabled: true
      };
      
      console.log('Guardando participante:', data);
      await setDoc(participantRef, data);
      console.log('Participante guardado exitosamente:', participant.userId);
    });

    await Promise.all(writePromises);
    console.log('Todos los participantes guardados exitosamente');
    return true;
  } catch (error) {
    console.error('Error en addParticipantsToEvent:', error);
    throw error;
  }
};

// Agregar equipo completo a evento
export const addTeamToEvent = async (eventId, teamId) => {
  try {
    const { getTeamById } = await import('./teams');
    const team = await getTeamById(teamId);
    
    if (!team) {
      throw new Error('Equipo no encontrado');
    }

    // Agregar cada miembro del equipo como participante con teamId
    const writePromises = team.members.map(async (userId) => {
      const participantRef = doc(collection(db, 'eventParticipants'));
      await setDoc(participantRef, {
        eventId,
        userId,
        teamId,
        enabled: true
      });
    });

    await Promise.all(writePromises);
    return true;
  } catch (error) {
    throw error;
  }
};

// Eliminar participantes de un evento
export const removeParticipantsFromEvent = async (eventId, userIds) => {
  try {
    if (!userIds || userIds.length === 0) {
      return true;
    }

    const participantsRef = collection(db, 'eventParticipants');
    const userIdsSet = new Set(userIds);
    
    // Firestore limita 'in' a 10 elementos, así que obtenemos todos los participantes del evento
    // y filtramos en memoria
    const q = query(
      participantsRef,
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);
    
    // Filtrar solo los que están en la lista de eliminación
    const docsToDelete = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return userIdsSet.has(data.userId);
    });
    
    const deletePromises = docsToDelete.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Obtener participantes de un evento
export const getEventParticipants = async (eventId) => {
  try {
    console.log('getEventParticipants llamado con eventId:', eventId);
    const participantsRef = collection(db, 'eventParticipants');
    const q = query(
      participantsRef,
      where('eventId', '==', eventId),
      where('enabled', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const participants = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Participantes encontrados:', participants.length, participants);
    return participants;
  } catch (error) {
    console.error('Error en getEventParticipants:', error);
    throw error;
  }
};

// Establecer ganador del evento
export const setEventWinner = async (eventId, winnerId, winnerTeamId = null) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const updates = {};
    
    if (winnerTeamId) {
      updates.winnerTeamId = winnerTeamId;
      updates.winnerId = null;
    } else if (winnerId) {
      updates.winnerId = winnerId;
      updates.winnerTeamId = null;
    }
    
    updates.winnerSetAt = serverTimestamp();
    await updateDoc(eventRef, updates);
    return true;
  } catch (error) {
    throw error;
  }
};
