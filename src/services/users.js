import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { hashPassword } from '../utils/passwordHash';

// Crear usuario
export const createUser = async (userData) => {
  try {
    const { username, password, userType, email, enabled = true } = userData;
    
    // Verificar si el usuario ya existe
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error('El usuario ya existe');
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const newUserRef = doc(collection(db, 'users'));
    await setDoc(newUserRef, {
      username,
      name: userData.name || username, // Nombre de la persona
      password: hashedPassword,
      userType: userType || 'SOLO_VISUALIZAR',
      email: email || '',
      photoURL: '',
      enabled,
      badges: [],
      createdAt: serverTimestamp()
    });

    return newUserRef.id;
  } catch (error) {
    throw error;
  }
};

// Obtener todos los usuarios
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: undefined // No retornar contraseñas
    }));
  } catch (error) {
    throw error;
  }
};

// Obtener usuario por ID
export const getUserById = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userSnap.data();
    const { password: _, ...userWithoutPassword } = userData;
    return {
      id: userSnap.id,
      ...userWithoutPassword
    };
  } catch (error) {
    throw error;
  }
};

// Obtener usuarios por tipo
export const getUsersByType = async (userType) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userType', '==', userType));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: undefined
    }));
  } catch (error) {
    throw error;
  }
};

// Actualizar usuario
export const updateUser = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }
    
    await updateDoc(userRef, updates);
    return true;
  } catch (error) {
    throw error;
  }
};

// Habilitar/Deshabilitar usuario
export const toggleUserEnabled = async (userId, enabled) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { enabled });
    return true;
  } catch (error) {
    throw error;
  }
};

// Eliminar usuario
export const deleteUser = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    throw error;
  }
};

// Actualizar foto de perfil
export const updateUserPhoto = async (userId, photoURL) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { photoURL });
    return true;
  } catch (error) {
    throw error;
  }
};

// Agregar insignia a usuario
export const addBadgeToUser = async (userId, badge) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userSnap.data();
    const badges = userData.badges || [];
    
    // Verificar si la insignia ya existe para este evento
    const existingBadgeIndex = badges.findIndex(b => b.eventId === badge.eventId);
    
    if (existingBadgeIndex >= 0) {
      badges[existingBadgeIndex] = badge;
    } else {
      badges.push(badge);
    }

    await updateDoc(userRef, { badges });
    return true;
  } catch (error) {
    throw error;
  }
};
