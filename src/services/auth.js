import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { hashPassword, verifyPassword } from '../utils/passwordHash';

// Login
export const login = async (username, password) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Usuario no encontrado');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verificar si el usuario está habilitado
    if (!userData.enabled) {
      throw new Error('Usuario deshabilitado. Contacte al administrador.');
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, userData.password);
    
    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // Retornar datos del usuario (sin contraseña)
    const { password: _, ...userWithoutPassword } = userData;
    return {
      id: userDoc.id,
      ...userWithoutPassword
    };
  } catch (error) {
    throw error;
  }
};

// Crear usuario (solo admin)
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
      password: hashedPassword,
      userType: userType || 'VOTANTE_APOSTADOR',
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

// Verificar si el usuario es admin
export const isAdmin = (user) => {
  return user && user.userType === 'ADMIN';
};
