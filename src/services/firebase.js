import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Storage removido - usando base64 y URLs directas en su lugar
// Analytics opcional - comentado para evitar errores si no está habilitado

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Opcional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Storage no se usa - el plan gratuito no lo incluye
// Usamos base64 para imágenes pequeñas y URLs directas para imágenes grandes

// Analytics opcional - descomentar si lo necesitas
// import { getAnalytics } from 'firebase/analytics';
// const analytics = getAnalytics(app);

export default app;
