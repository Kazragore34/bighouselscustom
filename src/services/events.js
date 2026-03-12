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
    
    // Limpiar campos undefined antes de enviar a Firestore
    const cleanData = Object.fromEntries(
      Object.entries({
        ...eventData,
        status: eventData.status || 'draft',
        createdAt: serverTimestamp(),
        startDate: eventData.startDate || null,
        endDate: eventData.endDate || null
      }).filter(([_, value]) => value !== undefined)
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
    
    // Limpiar campos undefined antes de enviar a Firestore
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
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

// Agregar participantes a evento
export const addParticipantsToEvent = async (eventId, userIds) => {
  try {
    const batch = [];
    
    for (const userId of userIds) {
      const participantRef = doc(collection(db, 'eventParticipants'));
      batch.push({
        id: participantRef.id,
        eventId,
        userId,
        enabled: true
      });
    }

    // Guardar todos los participantes
    const writePromises = batch.map(async (participant) => {
      const participantRef = doc(db, 'eventParticipants', participant.id);
      await setDoc(participantRef, {
        eventId: participant.eventId,
        userId: participant.userId,
        enabled: participant.enabled
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
