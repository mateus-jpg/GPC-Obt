"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { clientAuth as auth } from "@/lib/firebase/firebaseClient";
import { getFirestore, doc, getDoc, query, getDocs, collection, where, FieldPath} from "firebase/firestore";

const db = getFirestore();

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableStructures, setAvailableStructures] = useState([]);
  const [currentStructure, setCurrentStructure] = useState(null);
  // Fetch /api/auth/me and merge operator document
  const fetchUserWithOperator = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.user) return null;

      let fullUser = { ...data.user };

      // Fetch operator document if operatorId exists
      const operatorId = data.user.uid;
      if (operatorId) {
        const operatorDoc = await getDoc(doc(db, "operators", operatorId));
        if (operatorDoc.exists()) {
          fullUser = { ...fullUser, ...operatorDoc.data() };

          const structures =  fullUser.structureIds || [];        
          
            const structuresData = await getDocs(query(collection(db, "structures"), where("__name__", "in", structures)));
            const structuresWithId = structuresData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Fetched structures data with IDs:", structuresWithId);
            setAvailableStructures(structuresWithId);
        } else {
          console.warn("Operator document not found for", operatorId);
        }
      }

      console.log("Fetched full user:", fullUser);

      return fullUser;
    } catch (err) {
      console.error("Failed to fetch user or operator", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const fullUser = await fetchUserWithOperator();
      if (mounted) setUser(fullUser);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [fetchUserWithOperator]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Optionally rehydrate from Firebase token if needed
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Failed to create session cookie");

      const fullUser = await fetchUserWithOperator();
      setUser(fullUser);
    } finally {
      setLoading(false);
    }
  }, [fetchUserWithOperator]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/sessionLogout", { method: "POST" });
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut, availableStructures, currentStructure, setCurrentStructure }}>
      {children}
    </AuthContext.Provider>
  );
};