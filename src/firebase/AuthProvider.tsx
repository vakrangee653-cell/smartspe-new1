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
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
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
        const emailKey = (firebaseUser.email || '').toLowerCase().trim();

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDocSnap = await getDoc(userDocRef);
          let profileData: any = null;

          if (userDocSnap.exists()) {
            profileData = userDocSnap.data();
          } else {
            // Operator might have been registered manually by an Admin using a random temporary ID (e.g., op-234)
            // Let's query the 'users' collection to check if they exist by email.
            const usersCol = collection(db, 'users');
            const q = query(usersCol, where('email', '==', emailKey));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
              const matchedDoc = querySnap.docs[0];
              const matchedData = matchedDoc.data();
              
              // Migrate this document to the actual Firebase user UID
              profileData = {
                ...matchedData,
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                adminId: matchedData.adminId || matchedData.createdBy || ''
              };

              await setDoc(userDocRef, mapUserDoc(profileData));

              // Safely delete the old temporary document
              if (matchedDoc.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, 'users', matchedDoc.id));
              }
              console.log('[AuthProvider] Migrated temporary operator ID document to permanent Firebase UID:', firebaseUser.uid);
            }
          }

          if (profileData) {
            // Block login if user is Inactive or locked out
            if (profileData.status !== 'Active' || profileData.isLockedOut) {
              console.warn('[AuthProvider] Blocked sign-in for inactive or locked-out account:', emailKey);
              setUser(null);
              setUserProfile(null);
              await firebaseSignOut(auth);
              setLoading(false);
              return;
            }
            setUser(firebaseUser);
            setUserProfile(mapUserDoc(profileData));
          } else {
            // No profile found anywhere. Auto-create only for Super Admin to seed the system.
            if (emailKey === 'vakrangee653@gmail.com') {
              const preset = PRESET_OPERATORS[emailKey];
              const newProfile: Operator = {
                id: firebaseUser.uid,
                name: preset?.name || firebaseUser.displayName || 'Vakrangee Super Admin',
                email: emailKey,
                role: 'Super Admin',
                status: 'Active',
                walletLimit: preset?.walletLimit || 1000000,
                commissionRate: preset?.commissionRate || 100,
                phoneNumber: preset?.phoneNumber || firebaseUser.phoneNumber || '+91 90010 12345',
                failedAttempts: 0,
                isLockedOut: false,
                createdBy: 'System'
              };

              const mappedProfile = mapUserDoc(newProfile);
              await setDoc(userDocRef, mappedProfile);
              setUser(firebaseUser);
              setUserProfile(mappedProfile);
            } else {
              // Deleted or unregistered user! Sign out immediately and do not allow recreation!
              console.warn('[AuthProvider] Deletion Check: Profile not found. Signing out deleted/unregistered user:', emailKey);
              setUser(null);
              setUserProfile(null);
              await firebaseSignOut(auth);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('[AuthProvider] Error in auth profiling / migration:', err);
          if (emailKey === 'vakrangee653@gmail.com') {
            setUser(firebaseUser);
            setUserProfile({
              id: firebaseUser.uid,
              name: 'Vakrangee Super Admin',
              email: emailKey,
              role: 'Super Admin',
              status: 'Active',
              walletLimit: 1000000,
              commissionRate: 100,
              phoneNumber: '+91 90010 12345',
            });
          } else {
            setUser(null);
            setUserProfile(null);
            await firebaseSignOut(auth);
          }
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
