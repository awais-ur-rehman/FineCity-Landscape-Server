import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import env from './env.js';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK with graceful fallback.
 */
const initFirebase = (): admin.app.App | null => {
  if (firebaseApp) return firebaseApp;

  const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!existsSync(serviceAccountPath)) {
    console.warn(`Firebase service account not found at ${serviceAccountPath}. Push notifications disabled.`);
    return null;
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error: any) {
    console.warn('Firebase initialization failed:', error.message);
    return null;
  }
};

export default initFirebase;
export { admin };
