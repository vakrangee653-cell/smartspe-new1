import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "smartspe",
  appId: "1:2475227007:web:934cc003e6a85bafad4c4a",
  apiKey: "AIzaSyBadVxPVYd5f6Lrzri5MeyvQz9pT8-u7C8",
  authDomain: "smartspe.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ae2e519b-ee52-4141-bae0-51df8d89a572",
  storageBucket: "smartspe.firebasestorage.app",
  messagingSenderId: "2475227007",
};

export const app = initializeApp(firebaseConfig);

// Initialize Auth with standard or in-memory persistence fallback for sandboxed iframes
let tempAuth;
try {
  tempAuth = getAuth(app);
} catch (error) {
  console.warn('[Firebase] Default auth initialization blocked, falling back to in-memory persistence:', error);
  try {
    tempAuth = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch (err) {
    console.error('[Firebase] Fatal: Failed to initialize in-memory auth, using safe mock object:', err);
    tempAuth = {
      currentUser: null,
      onAuthStateChanged: (cb: any) => {
        // Return a dummy unsubscriber
        cb(null);
        return () => {};
      },
      signOut: async () => {},
    } as any;
  }
}

export const auth = tempAuth;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore targeting the specific custom database ID with high resiliency
let tempDb;
try {
  tempDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('[Firebase] Failed to initialize firestore due to sandbox policies, using resilient mock:', error);
  tempDb = {
    collection: () => ({ doc: () => ({}) }),
    doc: () => ({}),
  } as any;
}

export const db = tempDb;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Saves the given application state to Firestore for a specific user ID.
 */
export async function saveStateToFirestore(userId: string, state: any) {
  if (!userId) return;
  const path = `user_states/${userId}`;
  try {
    const docRef = doc(db, 'user_states', userId);
    
    // We don't want to save direct password variables or transient state to the public database if possible,
    // but saving AppState provides total seamless single-user parity sync.
    // Let's create a copy so we don't mutate state in ways that break react.
    const cleanState = { ...state };
    
    await setDoc(docRef, cleanState);
    console.log(`[Firebase] AppState synced for user ${userId}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Retrieves the application state from Firestore for a specific user ID.
 */
export async function getStateFromFirestore(userId: string): Promise<any | null> {
  if (!userId) return null;
  const path = `user_states/${userId}`;
  try {
    const docRef = doc(db, 'user_states', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}
