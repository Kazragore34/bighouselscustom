import {
  collection, doc, setDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// Crear notificación
export const createNotification = async (userId, type, title, message, extras = {}) => {
  try {
    const ref = doc(collection(db, 'notifications'));
    await setDoc(ref, {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      relatedEventId: extras.eventId || null,
      relatedBetId: extras.betId || null,
    });
    return ref.id;
  } catch (error) {
    console.error('Error creando notificación:', error);
  }
};

// Obtener notificaciones de un usuario (no leídas primero)
export const getNotificationsByUser = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Ordenar: no leídas primero, luego por fecha
    return notifs.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
};

// Marcar una notificación como leída
export const markNotificationRead = async (notifId) => {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (error) {
    console.error('Error marcando notificación:', error);
  }
};

// Marcar todas como leídas
export const markAllNotificationsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (error) {
    console.error('Error marcando todas como leídas:', error);
  }
};

// ── Helpers para tipos de notificación concretos ──────────────────────────────

export const notifyBetConfirmed = (userId, participantName, amount, eventId, betId) =>
  createNotification(
    userId,
    'apuesta_confirmada',
    'Apuesta confirmada ✓',
    `Tu apuesta de $${amount} en ${participantName} está activa`,
    { eventId, betId }
  );

export const notifyBetWon = (userId, participantName, payout, eventId, betId) =>
  createNotification(
    userId,
    'apuesta_ganada',
    '¡Ganaste! 🎉',
    `Tu apuesta en ${participantName} ganó $${payout}`,
    { eventId, betId }
  );

export const notifyBetLost = (userId, participantName, eventId, betId) =>
  createNotification(
    userId,
    'apuesta_perdida',
    'Apuesta perdida',
    `${participantName} no ganó. Mejor suerte la próxima`,
    { eventId, betId }
  );

export const notifyEventStarted = (userId, eventName, eventId) =>
  createNotification(
    userId,
    'evento_inicio',
    'Evento comenzando 📢',
    `El evento "${eventName}" ha comenzado`,
    { eventId }
  );

export const notifyEventRound = (userId, eventName, roundNumber, eventId) =>
  createNotification(
    userId,
    'evento_ronda',
    `Ronda ${roundNumber} ⚔️`,
    `La ronda ${roundNumber} de "${eventName}" está abierta`,
    { eventId }
  );

export const notifyBadgeEarned = (userId, badgeName) =>
  createNotification(
    userId,
    'insignia',
    'Nueva insignia 🏅',
    `Desbloqueaste: ${badgeName}`,
    {}
  );
