'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface UserProfile {
  userId: string;
  email: string;
  companyName?: string;
  companyAddress?: string;
  companyGst?: string;
  companyPhone?: string;
  logoUrl?: string;
  invoiceFooter?: string;
  invoiceNotes?: string;
  brandColor?: string; // Hex code of brand accent
  pdfTemplateId?: string; // 'classic' | 'modern' | 'minimal' | 'elegant'
  createdAt?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile from Firestore
  const loadProfile = async (uid: string, fallbackEmail: string) => {
    try {
      let docSnap;
      try {
        const docRef = doc(db, 'users', uid);
        docSnap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        return;
      }

      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Create initial profile
        const initialProfile: UserProfile = {
          userId: uid,
          email: fallbackEmail,
          companyName: '',
          companyAddress: '',
          companyGst: '',
          companyPhone: '',
          logoUrl: '',
          invoiceFooter: 'Thank you for your business!',
          invoiceNotes: 'Payment is expected within 15 days of invoice date.',
          brandColor: '#2563eb', // Blue-600
          pdfTemplateId: 'modern',
          createdAt: new Date().toISOString(),
        };
        try {
          const docRef = doc(db, 'users', uid);
          await setDoc(docRef, initialProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
          return;
        }
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.uid, currentUser.email || '');
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, companyName = '') => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create initial profile with company name
      const uid = userCredential.user.uid;
      const initialProfile: UserProfile = {
        userId: uid,
        email: email,
        companyName: companyName,
        companyAddress: '',
        companyGst: '',
        companyPhone: '',
        logoUrl: '',
        invoiceFooter: 'Thank you for your business!',
        invoiceNotes: 'Payment is expected within 15 days of invoice date.',
        brandColor: '#2563eb',
        pdfTemplateId: 'modern',
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'users', uid), initialProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
      setProfile(initialProfile);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("No authenticated user.");
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, updateProfile }}>
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
