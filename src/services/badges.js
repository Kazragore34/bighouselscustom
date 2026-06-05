import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Catálogo de insignias — id, nombre, icono
export const BADGE_CATALOG = {
  primera_apuesta:  { name: 'Primera Apuesta',       icon: '🎯' },
  primera_ganada:   { name: 'Primera Victoria',       icon: '💰' },
  racha_3:          { name: 'Racha de 3',             icon: '🔥' },
  racha_5:          { name: 'Racha de 5',             icon: '💎' },
  diez_ganadas:     { name: '10 Apuestas Ganadas',    icon: '📈' },
  veinticinco_gan:  { name: '25 Apuestas Ganadas',    icon: '🌟' },
  piloto:           { name: 'Piloto',                 icon: '🚗' },
  luchador:         { name: 'Luchador',               icon: '🥊' },
  tirador:          { name: 'Tirador',                icon: '🎯' },
  corredor:         { name: 'Corredor',               icon: '🏃' },
  postero:          { name: 'Postero',                icon: '🏁' },
  actor:            { name: 'Actor',                  icon: '🎭' },
  veterano_5:       { name: 'Veterano (5 eventos)',   icon: '⭐' },
  veterano_10:      { name: 'Leyenda (10 eventos)',   icon: '👑' },
  leyenda:          { name: 'Campeón',                icon: '🏆' },
  multi_ganador:    { name: 'Multi Ganador',          icon: '🏅' },
  apostador_ronda:  { name: 'Apostador de Ronda',     icon: '🎰' },
};

// Otorgar una insignia si el usuario no la tiene ya
export const awardBadge = async (userId, badgeId) => {
  if (!BADGE_CATALOG[badgeId]) return;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const current = snap.data().badges || [];
    const alreadyHas = current.some(b => (typeof b === 'string' ? b : b.id) === badgeId);
    if (alreadyHas) return;

    const badge = { id: badgeId, ...BADGE_CATALOG[badgeId], earnedAt: new Date().toISOString() };
    await updateDoc(userRef, { badges: arrayUnion(badge) });

    // Notificar al usuario
    try {
      const { notifyBadgeEarned } = await import('./notifications');
      await notifyBadgeEarned(userId, BADGE_CATALOG[badgeId].name);
    } catch {}

    return badge;
  } catch (error) {
    console.warn('Error otorgando insignia:', error);
  }
};

// Comprobar y otorgar insignias tras confirmar una apuesta
export const checkBadgesOnBetConfirmed = async (userId) => {
  try {
    const { getBetsByUser } = await import('./bets');
    const bets = await getBetsByUser(userId);
    const confirmed = bets.filter(b => b.status === 'confirmed' || b.status === 'GANADORA' || b.status === 'PERDIDA');

    // Primera apuesta
    if (confirmed.length >= 1) await awardBadge(userId, 'primera_apuesta');
  } catch (e) {
    console.warn('Error checkBadgesOnBetConfirmed:', e);
  }
};

// Comprobar y otorgar insignias tras ganar una apuesta
export const checkBadgesOnBetWon = async (userId) => {
  try {
    const { getBetsByUser } = await import('./bets');
    const bets = await getBetsByUser(userId);
    const won = bets.filter(b => b.status === 'GANADORA' || b.status === 'won' || b.status === 'paid_out');

    if (won.length >= 1) await awardBadge(userId, 'primera_ganada');
    if (won.length >= 10) await awardBadge(userId, 'diez_ganadas');
    if (won.length >= 25) await awardBadge(userId, 'veinticinco_gan');

    // Racha — ver si las últimas N fueron ganadoras
    const sorted = bets
      .filter(b => ['GANADORA', 'PERDIDA', 'won', 'paid_out'].includes(b.status))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    const last3 = sorted.slice(0, 3);
    const last5 = sorted.slice(0, 5);
    if (last3.length === 3 && last3.every(b => b.status === 'GANADORA' || b.status === 'won' || b.status === 'paid_out')) {
      await awardBadge(userId, 'racha_3');
    }
    if (last5.length === 5 && last5.every(b => b.status === 'GANADORA' || b.status === 'won' || b.status === 'paid_out')) {
      await awardBadge(userId, 'racha_5');
    }
  } catch (e) {
    console.warn('Error checkBadgesOnBetWon:', e);
  }
};

// Comprobar y otorgar insignias de participante en evento
export const checkBadgesOnEventWin = async (userId, eventType) => {
  try {
    // Insignia de tipo de evento
    const typeMap = {
      CARRERA_COCHES: 'piloto',
      PELEA_COMBATE:  'luchador',
      DISPAROS:       'tirador',
      CARRERA_PIE:    'corredor',
      POSTA_EQUIPOS:  'postero',
      ROL_LIBRE:      'actor',
      race:           'piloto',
      fight:          'luchador',
    };
    const badgeId = typeMap[eventType];
    if (badgeId) await awardBadge(userId, badgeId);

    // Campeón (ganó un evento)
    await awardBadge(userId, 'leyenda');
  } catch (e) {
    console.warn('Error checkBadgesOnEventWin:', e);
  }
};
