'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  currentUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/app/lib/firebase';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('Firebase user:', firebaseUser);

          const userDoc = await getDoc(doc(db, 'operators', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,    
              emailVerified: firebaseUser.emailVerified,
              ...userData,
              createdAt: userData.createdAt?.toDate(),
              updatedAt: userData.updatedAt?.toDate()
            });
          } else {
            // Create new user document
            const newUser = {
              email: firebaseUser.email,
              isFirstLogin: true,
              displayName: firebaseUser.displayName || null,
              photoURL: firebaseUser.photoURL || null,
              emailVerified: firebaseUser.emailVerified,
              isAdmin: false,
              structureId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            await setDoc(doc(db, 'operators', firebaseUser.uid), newUser);
            setUser({ 
              uid: firebaseUser.uid, 
              ...newUser 
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);


  const signInWithEmail = useCallback(async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }, []);

  
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        console.error('Resend verification error:', error);
        throw error;
      }
    } else {
      throw new Error("No user is currently signed in.");
    }
  }, []);

  const updateUserProfile = useCallback(async (profile) => {
    if (!user) return;

    try {
      const updatedData = {
        ...profile,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'operators', user.uid), updatedData, { merge: true });
      setUser(prevUser => ({ ...prevUser, ...updatedData }));
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, [user]);


  const getUserIdToken = useCallback(async (forceRefresh = false) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken(forceRefresh);
        return idToken;
      } catch (error) {
        console.error("Error getting user ID token:", error);
        throw error;
      }
    }
    return null;
  }, []);
  const value = {
    user,
    loading,
    getUserIdToken,
    signInWithEmail,
    signOut,
    sendPasswordResetEmail,
    resendVerificationEmail,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};