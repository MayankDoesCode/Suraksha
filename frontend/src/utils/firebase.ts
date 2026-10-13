import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import legacyFirebaseConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  source: 'env' | 'fallback' | 'unconfigured';
  missingKeys: string[];
  warningMessage: string | null;
}

// 1. Read environment variables exposed by Vite
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// Required keys for standard Firebase Web Auth + Firestore
const missingEnvKeys: string[] = [];
if (!envConfig.apiKey) missingEnvKeys.push('VITE_FIREBASE_API_KEY');
if (!envConfig.authDomain) missingEnvKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!envConfig.projectId) missingEnvKeys.push('VITE_FIREBASE_PROJECT_ID');
if (!envConfig.appId) missingEnvKeys.push('VITE_FIREBASE_APP_ID');

const hasCompleteEnvConfig = missingEnvKeys.length === 0;
const isProduction = Boolean(import.meta.env.PROD);

let resolvedConfig: {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
};

export let firebaseConfigStatus: FirebaseConfigStatus;

if (hasCompleteEnvConfig) {
  resolvedConfig = {
    apiKey: envConfig.apiKey!,
    authDomain: envConfig.authDomain,
    projectId: envConfig.projectId!,
    storageBucket: envConfig.storageBucket,
    messagingSenderId: envConfig.messagingSenderId,
    appId: envConfig.appId!,
    measurementId: envConfig.measurementId,
    firestoreDatabaseId: envConfig.firestoreDatabaseId || '(default)',
  };
  firebaseConfigStatus = {
    isConfigured: true,
    source: 'env',
    missingKeys: [],
    warningMessage: null,
  };
  console.info(`[SURAKSHA] Firebase initialized via environment variables (Project: ${resolvedConfig.projectId})`);
} else if (!isProduction) {
  // Local development compatibility fallback only
  resolvedConfig = {
    ...legacyFirebaseConfig,
    firestoreDatabaseId: legacyFirebaseConfig.firestoreDatabaseId || '(default)',
  };
  firebaseConfigStatus = {
    isConfigured: true,
    source: 'fallback',
    missingKeys: missingEnvKeys,
    warningMessage: `Local development mode: Using fallback config from firebase-applet-config.json. Missing env vars: ${missingEnvKeys.join(', ')}`,
  };
  console.warn(`[SURAKSHA Firebase Notice] ${firebaseConfigStatus.warningMessage}`);
} else {
  // Production deployment: Do NOT silently use the legacy project
  resolvedConfig = {
    apiKey: 'UNCONFIGURED_PRODUCTION_KEY',
    authDomain: 'unconfigured.firebaseapp.com',
    projectId: 'unconfigured-suraksha-project',
    appId: '1:000000000000:web:0000000000000000000000',
    firestoreDatabaseId: '(default)',
  };
  firebaseConfigStatus = {
    isConfigured: false,
    source: 'unconfigured',
    missingKeys: missingEnvKeys,
    warningMessage: `Production deployment missing required Firebase environment variables: ${missingEnvKeys.join(', ')}. Legacy fallback config is disabled in production.`,
  };
  console.error(`[SURAKSHA Security Warning] ${firebaseConfigStatus.warningMessage}`);
}

const app: FirebaseApp = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure persistence is set to browser local if configured
if (firebaseConfigStatus.isConfigured) {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('Firebase auth persistence configuration warning:', err);
  });
}

// Test firestore connection per skill instructions
export async function testFirestoreConnection() {
  if (!firebaseConfigStatus.isConfigured) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
  }
}
