import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with dedicated Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Google Auth Provider configured for Web popup authentication
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Operation Types for audit & error handling
export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export interface FirestoreErrorContext {
  operation: OperationType;
  path: string;
  timestamp: string;
  code?: string;
  originalMessage?: string;
}

export class FirestorePermissionError extends Error {
  context: FirestoreErrorContext;
  constructor(context: FirestoreErrorContext) {
    super(`Firestore permission denied during ${context.operation} at ${context.path}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}

/**
 * Standard error handler for Firestore calls
 */
export function handleFirestoreError(error: unknown, operation: OperationType, path: string): never {
  const err = error as { code?: string; message?: string };
  const context: FirestoreErrorContext = {
    operation,
    path,
    timestamp: new Date().toISOString(),
    code: err?.code,
    originalMessage: err?.message,
  };

  console.error(`[Firestore Error] ${operation} on ${path}:`, err);

  if (err?.code === 'permission-denied') {
    throw new FirestorePermissionError(context);
  }

  throw error;
}

export { signInWithPopup, signOut, type User };
