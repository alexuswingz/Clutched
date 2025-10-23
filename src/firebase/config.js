// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAdNUupKhiV4n_4I2HB6QM1vj4WZII_WHU",
  authDomain: "clutch-21069.firebaseapp.com",
  projectId: "clutch-21069",
  storageBucket: "clutch-21069.firebasestorage.app",
  messagingSenderId: "759038457179",
  appId: "1:759038457179:web:b2ea65cbde1e3bfd85d67e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
