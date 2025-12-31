// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración de TU base de datos (JuegoPruebas)
const firebaseConfig = {
  apiKey: "AIzaSyDtGoAyjkxT6VtzaqTVr9uCb-WGQrizGdAg",
  authDomain: "juegopruebas-20687.firebaseapp.com",
  projectId: "juegopruebas-20687",
  storageBucket: "juegopruebas-20687.firebasestorage.app",
  messagingSenderId: "73620462400",
  appId: "1:73620462400:web:92e4539adbfbb9dab1f8a5"
};

// Inicializamos la conexión
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);