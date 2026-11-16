import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase web config is public by design (security comes from Auth + rules, not from hiding these).
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCccZX0X8u6VXmoTySd5YjBYXt5TLCLuUI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'animforge-studio-16666.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'animforge-studio-16666',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:105299907482:web:e36f820095bab0df95e023',
};

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);

export const auth = isFirebaseConfigured ? getAuth(initializeApp(cfg)) : null;
