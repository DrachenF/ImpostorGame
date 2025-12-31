// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBwJYyOflTWcmvhfPVCcKifbgBjXZb1QJA",
  authDomain: "impostorgame-d25ad.firebaseapp.com",
  projectId: "impostorgame-d25ad",
  storageBucket: "impostorgame-d25ad.firebasestorage.app",
  messagingSenderId: "263591109890",
  appId: "1:263591109890:web:abf7c0ab0ff5aad95e8e1b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
