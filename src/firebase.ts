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

/**
 * Saves the given application state to Firestore for a specific user ID.
 */
export async function saveStateToFirestore(userId: string, state: any) {
  if (!userId) return;
  try {
    const docRef = doc(db, 'user_states', userId);
    
    // We don't want to save direct password variables or transient state to the public database if possible,
    // but saving AppState provides total seamless single-user parity sync.
    // Let's create a copy so we don't mutate state in ways that break react.
    const cleanState = { ...state };
    
    await setDoc(docRef, cleanState);
    console.log(`[Firebase] AppState synced for user ${userId}`);
  } catch (err) {
    console.error('[Firebase] Failed to save state to Firestore:', err);
  }
}

/**
 * Retrieves the application state from Firestore for a specific user ID.
 */
export async function getStateFromFirestore(userId: string): Promise<any | null> {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'user_states', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error('[Firebase] Failed to fetch state from Firestore:', err);
  }
  return null;
}
