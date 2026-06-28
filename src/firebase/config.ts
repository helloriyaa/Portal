import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "gen-lang-client-0012196843",
  appId: "1:800711786360:web:d9f95fb7b5fd08e4fd528d",
  apiKey: "AIzaSyAe9GBVa8QDbGE8xtmRgYpnfxbmcnJkYa0",
  authDomain: "gen-lang-client-0012196843.firebaseapp.com",
  storageBucket: "gen-lang-client-0012196843.firebasestorage.app",
  messagingSenderId: "800711786360"
};

const databaseId = "ai-studio-a55b5828-33ce-4c2d-b5f3-6e57048407cd";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with custom databaseId
export const db = initializeFirestore(app, {}, databaseId);

// Initialize Firebase Storage
export const storage = getStorage(app);
