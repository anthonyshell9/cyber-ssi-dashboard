// src/db/firebase.jsx
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  browserSessionPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBTIHUXCh6al58IYUbZaqndhjpUB1VbHIQ",
  authDomain: "cyber-ssi-work.firebaseapp.com",
  projectId: "cyber-ssi-work",
  storageBucket: "cyber-ssi-work.appspot.com",
  messagingSenderId: "889821808840",
  appId: "1:889821808840:web:ae8f0086549df0af567dfd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const googleProvider = new GoogleAuthProvider();

// Persistance session navigateur
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.warn("Erreur de persistance :", error.code);
});
