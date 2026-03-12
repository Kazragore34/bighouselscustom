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
import { 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
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

// Crear usuario (ahora público, pero con permisos limitados por defecto)
export const createUser = async (userData) => {
  try {
    const { username, password, userType, email, name, enabled = true } = userData;
    
    // Verificar si el usuario ya existe (solo lectura del campo username)
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
      name: name || username, // Nombre de la persona (puede ser diferente al username)
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

// Login con Google
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;
    
    // Verificar si el usuario ya existe en Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', googleUser.email));
    const querySnapshot = await getDocs(q);

    let userData;
    
    if (querySnapshot.empty) {
      // Crear nuevo usuario desde Google
      const newUserRef = doc(collection(db, 'users'));
      const newUser = {
        username: googleUser.email.split('@')[0] || `user_${Date.now()}`,
        name: googleUser.displayName || googleUser.email.split('@')[0],
        email: googleUser.email,
        photoURL: googleUser.photoURL || '',
        userType: 'SOLO_VISUALIZAR',
        enabled: true,
        badges: [],
        createdAt: serverTimestamp(),
        googleAuth: true // Marcar que viene de Google
      };
      
      await setDoc(newUserRef, newUser);
      userData = {
        id: newUserRef.id,
        ...newUser
      };
    } else {
      // Usuario existente
      const userDoc = querySnapshot.docs[0];
      const existingUser = userDoc.data();
      
      // Actualizar foto si viene de Google y no tiene
      if (googleUser.photoURL && !existingUser.photoURL) {
        await updateDoc(userDoc.ref, { photoURL: googleUser.photoURL });
      }
      
      userData = {
        id: userDoc.id,
        ...existingUser,
        photoURL: googleUser.photoURL || existingUser.photoURL
      };
    }

    // Verificar si está habilitado
    if (!userData.enabled) {
      await firebaseSignOut(auth);
      throw new Error('Usuario deshabilitado. Contacte al administrador.');
    }

    return userData;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Inicio de sesión cancelado');
    }
    throw error;
  }
};

// Verificar si el usuario es admin
export const isAdmin = (user) => {
  return user && user.userType === 'ADMIN';
};
