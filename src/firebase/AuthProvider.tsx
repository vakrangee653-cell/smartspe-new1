import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db, googleProvider, mapUserDoc } from '../firebase';
import { Operator, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: Operator | null;
  role: UserRole | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<any>;
  registerWithEmail: (email: string, pass: string, name: string, phone: string, role: UserRole) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  setUserProfile: React.Dispatch<React.SetStateAction<Operator | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset operators map for automatic registration / migration fallback
const PRESET_OPERATORS: { [email: string]: any } = {
  'vakrangee653@gmail.com': {
    name: 'Vakrangee Super Admin',
    role: 'Super Admin',
    phoneNumber: '+91 90010 12345',
    password: 'superadmin123',
    walletLimit: 1000000,
    commissionRate: 100,
  },
  'rajendra.spe@gmail.com': {
    name: 'Rajendra Prasad',
    role: 'Admin',
    phoneNumber: '+91 98290 12345',
    password: 'admin123',
    walletLimit: 500000,
    commissionRate: 80,
  },
  'smartspeatm@gmail.com': {
    name: 'SmartSPE ATM Admin',
    role: 'Admin',
    phoneNumber: '+91 99999 77777',
    password: 'admin123',
    walletLimit: 500000,
    commissionRate: 80,
  },
  'suresh.emitra@gmail.com': {
    name: 'Suresh Kumar',
    role: 'Operator',
    phoneNumber: '+91 99887 76655',
    password: 'operator123',
    walletLimit: 15000,
    commissionRate: 12,
  },
  'priyanka.csp@gmail.com': {
    name: 'Priyanka Sharma',
    role: 'Operator',
    phoneNumber: '+91 91160 55555',
    password: 'operator123',
    walletLimit: 15000,
    commissionRate: 15,
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const emailKey = (firebaseUser.email || '').toLowerCase().trim();

        // 1. Fetch user profile from Firestore 'users' collection
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as Operator);
          } else {
            // Check if email matches a preset operator to auto-create profile
            const preset = PRESET_OPERATORS[emailKey];
            const defaultRole: UserRole = (emailKey === 'vakrangee653@gmail.com') ? 'Super Admin' : (emailKey.includes('admin') || emailKey === 'smartspeatm@gmail.com' ? 'Admin' : 'Operator');
            
            const newProfile: Operator = {
              id: firebaseUser.uid,
              name: preset?.name || firebaseUser.displayName || 'Operator User',
              email: emailKey,
              role: preset?.role || defaultRole,
              status: 'Active',
              walletLimit: preset?.walletLimit || 15000,
              commissionRate: preset?.commissionRate || 12,
              phoneNumber: preset?.phoneNumber || firebaseUser.phoneNumber || '+91 99999 55555',
              failedAttempts: 0,
              isLockedOut: false,
              createdBy: 'System'
            };

            const mappedProfile = mapUserDoc(newProfile);
            await setDoc(userDocRef, mappedProfile);
            setUserProfile(mappedProfile);
          }
        } catch (err) {
          console.error('[AuthProvider] Error fetching or creating profile in Firestore:', err);
          // Temporary fallback profile in memory to prevent app crashes
          setUserProfile({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Operator User',
            email: emailKey,
            role: emailKey === 'vakrangee653@gmail.com' ? 'Super Admin' : 'Operator',
            status: 'Active',
            walletLimit: 15000,
            commissionRate: 12,
            phoneNumber: '+91 99999 55555',
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login using Email and Password with dynamic fallback to auto-register preset accounts
  const loginWithEmail = async (email: string, pass: string) => {
    const emailKey = email.toLowerCase().trim();
    try {
      return await signInWithEmailAndPassword(auth, emailKey, pass);
    } catch (err: any) {
      // If user not found, but exists in preset operators with correct password, auto-create them!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        const preset = PRESET_OPERATORS[emailKey];
        if (preset && preset.password === pass) {
          console.log('[AuthProvider] Auto-creating preset Firebase account for:', emailKey);
          const cred = await createUserWithEmailAndPassword(auth, emailKey, pass);
          
          // Write profile to 'users' collection
          const userDocRef = doc(db, 'users', cred.user.uid);
          const newProfile: Operator = {
            id: cred.user.uid,
            name: preset.name,
            email: emailKey,
            role: preset.role,
            status: 'Active',
            walletLimit: preset.walletLimit,
            commissionRate: preset.commissionRate,
            phoneNumber: preset.phoneNumber,
            failedAttempts: 0,
            isLockedOut: false,
            createdBy: 'System'
          };
          const mappedProfile = mapUserDoc(newProfile);
          await setDoc(userDocRef, mappedProfile);
          setUserProfile(mappedProfile);
          return cred;
        }
      }
      throw err;
    }
  };

  // Register using Email and Password
  const registerWithEmail = async (email: string, pass: string, name: string, phone: string, role: UserRole) => {
    const emailKey = email.toLowerCase().trim();
    const cred = await createUserWithEmailAndPassword(auth, emailKey, pass);
    
    // Create profile in 'users' collection
    const userDocRef = doc(db, 'users', cred.user.uid);
    const newProfile: Operator = {
      id: cred.user.uid,
      name,
      email: emailKey,
      role,
      status: 'Active',
      walletLimit: role === 'Super Admin' ? 1000000 : (role === 'Admin' ? 500000 : 15000),
      commissionRate: role === 'Super Admin' ? 100 : (role === 'Admin' ? 80 : 12),
      phoneNumber: phone,
      failedAttempts: 0,
      isLockedOut: false,
      createdBy: auth.currentUser?.uid || 'Self'
    };
    const mappedProfile = mapUserDoc(newProfile);
    await setDoc(userDocRef, mappedProfile);
    return cred;
  };

  // Google popup sign in
  const loginWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
  };

  // Logout
  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const role = userProfile ? userProfile.role : null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      role, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      loginWithGoogle, 
      logout,
      setUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
