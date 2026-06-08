'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithEmail: (email: string, pass: string, isSignUp: boolean) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  setError: () => {},
  signInWithGoogle: async () => {},
  signInAnonymously: async () => {},
  signInWithEmail: async () => {},
  logOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to prevent auto-login frustrations
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google SignIn Error: ', err);
      setError(err?.message || String(err));
    }
  };

  const signInAnonymously = async () => {
    setError(null);
    try {
      await firebaseSignInAnonymously(auth);
    } catch (err: any) {
      console.error('Anonymous SignIn Error: ', err);
      setError(err?.message || String(err));
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string, isSignUp: boolean) => {
    setError(null);
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCred.user, {
          displayName: 'Guest Member'
        });
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      console.error('Email SignIn Error: ', err);
      setError(err?.message || String(err));
      throw err;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('SignOut Error: ', err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      setError, 
      signInWithGoogle, 
      signInAnonymously, 
      signInWithEmail, 
      logOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

