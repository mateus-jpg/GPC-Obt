// hooks/useLogout.js
"use client";

import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/firebaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return; // Prevent multiple simultaneous logout attempts
    
    setIsLoggingOut(true);
    
    try {
      console.log("Starting logout process...");
      
      // 1. Sign out from Firebase client first
      if (clientAuth.currentUser) {
        await signOut(clientAuth);
        console.log("✓ Firebase client logout successful");
      }

      // 2. Call server logout to clear session cookie
      const response = await fetch("/api/auth/sessionLogout", {
        method: 'POST',
        credentials: 'same-origin' // Ensure cookies are sent
      });

      if (response.ok) {
        console.log("✓ Server logout successful");
      } else {
        console.warn("⚠ Server logout failed, but continuing...");
      }

      // 3. Navigate to login page
      console.log("✓ Redirecting to login...");
      router.push("/login");
      
    } catch (error) {
      console.error("Logout error:", error);
      
      // Even if there's an error, try to navigate to login
      // This ensures user isn't stuck in a bad state
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}

// Usage in your component:
// import { useLogout } from "@/hooks/useLogout";
// 
// const { logout, isLoggingOut } = useLogout();
//
// <DropdownMenuItem onClick={logout} disabled={isLoggingOut}>
//   <IconLogout />
//   {isLoggingOut ? "Logging out..." : "Log out"}
// </DropdownMenuItem>