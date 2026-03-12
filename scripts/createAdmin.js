// Script para crear el primer usuario admin
// Ejecutar: node scripts/createAdmin.js

import bcrypt from 'bcryptjs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCv6CPu75hbdxgDdYFrforEp03_b-hYCJ0",
  authDomain: "apuesta-7c52d.firebaseapp.com",
  projectId: "apuesta-7c52d",
  storageBucket: "apuesta-7c52d.firebasestorage.app",
  messagingSenderId: "779848807884",
  appId: "1:779848807884:web:2cc9b97c4393e7b7cbd969"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createAdmin() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question('Usuario admin: ', (username) => {
      readline.question('Contraseña: ', async (password) => {
        readline.question('Email (opcional): ', async (email) => {
          try {
            // Hash de la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Crear usuario admin
            const userRef = await addDoc(collection(db, 'users'), {
              username: username,
              password: hashedPassword,
              userType: 'ADMIN',
              email: email || '',
              photoURL: '',
              enabled: true,
              badges: [],
              createdAt: serverTimestamp()
            });

            console.log('\n✅ Usuario admin creado exitosamente!');
            console.log(`ID: ${userRef.id}`);
            console.log(`Usuario: ${username}`);
            console.log('\nAhora puedes iniciar sesión con estas credenciales.');
            
            readline.close();
            resolve();
          } catch (error) {
            console.error('❌ Error:', error.message);
            readline.close();
            resolve();
          }
        });
      });
    });
  });
}

createAdmin();
