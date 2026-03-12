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

// Eliminar evento
export const deleteEvent = async (eventId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
    return true;
  } catch (error) {
    throw error;
  }
};

// Agregar participantes a evento (individuales o por equipos)
export const addParticipantsToEvent = async (eventId, participants) => {
  try {
    // participants puede ser array de userIds o array de objetos {userId, teamId}
    const participantsArray = Array.isArray(participants) && participants.length > 0 && typeof participants[0] === 'string'
      ? participants.map(userId => ({ userId }))
      : participants;

    const writePromises = participantsArray.map(async (participant) => {
      const participantRef = doc(collection(db, 'eventParticipants'));
      await setDoc(participantRef, {
        eventId,
        userId: participant.userId || null,
        teamId: participant.teamId || null,
        enabled: true
      });
    });

    await Promise.all(writePromises);
    return true;
  } catch (error) {
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

// Obtener participantes de un evento
export const getEventParticipants = async (eventId) => {
  try {
    const participantsRef = collection(db, 'eventParticipants');
    const q = query(
      participantsRef,
      where('eventId', '==', eventId),
      where('enabled', '==', true)
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
