"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { clientAuth as auth } from "@/lib/firebase/firebaseClient";
import { getFirestore, doc, getDoc, query, getDocs, collection, where } from "firebase/firestore";

const db = getFirestore();

const AuthContext = createContext(undefined);

// Cache configuration
const AUTH_CACHE_KEY = 'gpc_auth_cache';
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get cached auth data from localStorage
 * @returns {Object|null} Cached user data or null if expired/missing
 */
function getCachedAuthData() {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;

    const { data, expiresAt } = JSON.parse(cached);

    // Check if cache has expired
    if (Date.now() > expiresAt) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading auth cache:', error);
    localStorage.removeItem(AUTH_CACHE_KEY);
    return null;
  }
}

/**
 * Store auth data in localStorage cache
 * @param {Object} data - The auth data to cache
 */
function setCachedAuthData(data) {
  if (typeof window === 'undefined') return;

  try {
    const cacheEntry = {
      data,
      expiresAt: Date.now() + AUTH_CACHE_TTL,
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Error writing auth cache:', error);
  }
}

/**
 * Clear auth data from localStorage cache
 */
function clearCachedAuthData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_CACHE_KEY);
}

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
  const fetchUserWithOperator = useCallback(async (skipCache = false) => {
    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cachedData = getCachedAuthData();
      if (cachedData) {
        console.log("Using cached auth data");
        setAvailableStructures(cachedData.structures || []);
        return cachedData.user;
      }
    }

    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.user) return null;

      let fullUser = { ...data.user };
      let structures = [];

      // Fetch operator document if operatorId exists
      const operatorId = data.user.uid;
      if (operatorId) {
        const operatorDoc = await getDoc(doc(db, "operators", operatorId));
        if (operatorDoc.exists()) {
          fullUser = { ...fullUser, ...operatorDoc.data() };

          const structureIds = fullUser.structureIds || [];
          if (structureIds.length > 0) {
            const structuresData = await getDocs(
              query(collection(db, "structures"), where("__name__", "in", structureIds))
            );
            structures = structuresData.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Fetched structures data with IDs:", structures);
            setAvailableStructures(structures);
          }
        } else {
          console.warn("Operator document not found for", operatorId);
        }
      }

      console.log("Fetched full user:", fullUser);

      // Cache the fetched data
      setCachedAuthData({
        user: fullUser,
        structures,
      });

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
    const unsubscribe = onAuthStateChanged(auth, async () => {
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

      // Clear cache and fetch fresh data on login
      clearCachedAuthData();
      const fullUser = await fetchUserWithOperator(true); // Skip cache
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
      // Clear cached auth data on logout
      clearCachedAuthData();
      setUser(null);
      setAvailableStructures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to force refresh auth data (useful after profile updates)
  const refreshAuthData = useCallback(async () => {
    clearCachedAuthData();
    const fullUser = await fetchUserWithOperator(true);
    setUser(fullUser);
    return fullUser;
  }, [fetchUserWithOperator]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithEmail,
      signOut,
      availableStructures,
      currentStructure,
      setCurrentStructure,
      refreshAuthData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
