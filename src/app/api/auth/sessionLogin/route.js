import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req) {
  try {
    const { idToken } = await req.json();
    
    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 400 });
    }

    // Verify the ID token first
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Create session cookie (5 days expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json({ 
      success: true, 
      uid: decodedToken.uid 
    });
    
    const cookieName = process.env.SESSION_COOKIE_NAME || "session";
    
    // Set new secure cookie with proper attributes
    response.cookies.set(cookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use env variable
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
      // Add domain if needed for subdomain support
      // domain: process.env.COOKIE_DOMAIN,
    });
    
    console.log(`Created session for user: ${decodedToken.uid}`);
    
    return response;
  } catch (error) {
    console.error("Session login error:", error);
    return NextResponse.json({ 
      error: error.message.includes('Token expired') 
        ? "Session expired, please try again" 
        : "Authentication failed" 
    }, { status: 401 });
  }
}