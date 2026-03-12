import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginService, loginWithGoogle } from '../services/auth';
import { getUserById } from '../services/users';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para refrescar los datos del usuario desde Firestore
  const refreshUser = async () => {
    if (!user || !user.id) {
      return;
    }

    try {
      let userData = null;
      
      // Intentar obtener por ID primero
      try {
        userData = await getUserById(user.id);
      } catch (error) {
        // Si falla por ID, intentar por email o username
        if (user.email) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDataFromDoc = userDoc.data();
            const { password: _, ...userWithoutPassword } = userDataFromDoc;
            userData = {
              id: userDoc.id,
              ...userWithoutPassword
            };
          }
        } else if (user.username) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', user.username));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDataFromDoc = userDoc.data();
            const { password: _, ...userWithoutPassword } = userDataFromDoc;
            userData = {
              id: userDoc.id,
              ...userWithoutPassword
            };
          }
        }
      }

      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('Usuario refrescado desde Firestore:', userData);
      }
    } catch (error) {
      console.error('Error refrescando usuario:', error);
    }
  };

  useEffect(() => {
    // Verificar si hay usuario en localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Refrescar datos desde Firestore después de cargar desde localStorage
        // Esto asegura que tenemos los datos más recientes
        setTimeout(() => {
          refreshUser();
        }, 500);
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const userData = await loginService(username, password);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const loginGoogle = async () => {
    try {
      const userData = await loginWithGoogle();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAdmin = () => {
    return user && user.userType === 'ADMIN';
  };

  const value = {
    user,
    login,
    loginGoogle,
    logout,
    refreshUser,
    isAdmin: isAdmin(),
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
