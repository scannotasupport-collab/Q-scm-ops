import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  User,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserIndustryProfile } from '../types';
import { getUserProfile, saveUserProfile } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveCloudProfile: (profile: UserIndustryProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  logout: async () => {},
  saveCloudProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setError(null);

      if (currentUser) {
        // Sync user document and profile if available
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);

          const localProfile = getUserProfile();

          if (snap.exists()) {
            const data = snap.data();
            const now = new Date().toISOString();
            // Keep last login activity fresh
            await setDoc(
              userDocRef,
              {
                lastLoginAt: now,
                updatedAt: now,
                displayName: currentUser.displayName || data.displayName || 'Praktisi Industri',
                photoURL: currentUser.photoURL || data.photoURL || '',
              },
              { merge: true }
            );

            // If remote has industry profile, restore to local storage
            if (data.industry) {
              const restoredProfile: UserIndustryProfile = {
                industry: data.industry,
                role: data.role || '',
                plantScale: data.plantScale || '',
              };
              saveUserProfile(restoredProfile);
            }
          } else {
            // First time login - save initial user profile
            const now = new Date().toISOString();
            await setDoc(userDocRef, {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Praktisi Industri',
              photoURL: currentUser.photoURL || '',
              industry: localProfile?.industry || '',
              role: localProfile?.role || '',
              plantScale: localProfile?.plantScale || '',
              lastLoginAt: now,
              createdAt: now,
              updatedAt: now,
            });
          }
        } catch (err) {
          console.warn('Initial profile sync warning:', err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error('Google Sign-In Error:', e);
      if (e.code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan (popup ditutup)');
      } else if (e.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized-domain')) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'q.maravva-tech.com';
        setError(
          `Domain "${currentDomain}" perlu ditambahkan ke daftar "Authorized domains" di Firebase Console (Authentication > Settings > Authorized domains).`
        );
      } else {
        setError(e.message || 'Gagal login dengan Google. Silakan coba lagi.');
      }
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Gagal logout.');
    }
  };

  const saveCloudProfile = async (profile: UserIndustryProfile) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const now = new Date().toISOString();
      await setDoc(
        userDocRef,
        {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Praktisi Industri',
          photoURL: user.photoURL || '',
          industry: profile.industry || '',
          role: profile.role || '',
          plantScale: profile.plantScale || '',
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, logout, saveCloudProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
