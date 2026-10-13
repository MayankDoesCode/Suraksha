import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, testFirestoreConnection } from '../utils/firebase';

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  organization?: string;
  role?: string;
  createdAt?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, org: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
  signInAsDemoAnalyst: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const signInAsDemoAnalyst = () => {
    const demoUser: any = {
      uid: 'analyst-demo-001',
      email: 'analyst@suraksha.local',
      displayName: 'Alex Mercer (Threat Lead)',
      emailVerified: true,
    };
    const demoProfile: UserProfileData = {
      uid: 'analyst-demo-001',
      email: 'analyst@suraksha.local',
      displayName: 'Alex Mercer (Threat Lead)',
      organization: 'SURAKSHA SecOps',
      role: 'Principal Threat Intelligence Analyst',
      createdAt: new Date().toISOString(),
      emailVerified: true,
    };
    setCurrentUser(demoUser);
    setUserProfile(demoProfile);
    setLoading(false);
  };

  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfileData);
          } else {
            // Document does not exist yet (e.g. first Google Sign-in)
            const newProfile: UserProfileData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Analyst',
              organization: 'Suraksha Security Ops',
              role: 'Security Analyst',
              createdAt: new Date().toISOString(),
              emailVerified: user.emailVerified,
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Error reading or provisioning user profile:', err);
          // Fallback profile from auth token
          setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Analyst',
            organization: 'Security Operations',
            role: 'Security Analyst',
            emailVerified: user.emailVerified,
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      const code = err.code || '';
      let msg = 'Failed to sign in. Please verify your credentials.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please check your credentials.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Please enter a valid work email address.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to many failed login attempts. Try again later or reset password.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const signUp = async (email: string, pass: string, name: string, org: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });

      const newProfile: UserProfileData = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: name,
        organization: org || 'Security Operations',
        role: 'Brand Security Analyst',
        createdAt: new Date().toISOString(),
        emailVerified: cred.user.emailVerified,
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      } catch (docErr) {
        console.warn('Note: Profile doc set error:', docErr);
      }
      setUserProfile(newProfile);
    } catch (err: any) {
      const code = err.code || '';
      let msg = 'Failed to create workspace account.';
      if (code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please sign in instead.';
      } else if (code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Please enter a valid work email address.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const newProfile: UserProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Google User',
          organization: 'Enterprise Workspace',
          role: 'Security Analyst',
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified,
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(snap.data() as UserProfileData);
      }
    } catch (err: any) {
      let msg = 'Google authentication was cancelled or could not be completed.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in popup closed before finishing authentication.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please allow popups for this site.';
      } else if (err.code === 'auth/unauthorized-domain') {
        msg = 'This domain is not yet authorized in Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      let msg = 'Unable to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        logOut,
        signInAsDemoAnalyst,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
