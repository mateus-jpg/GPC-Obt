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
    
    // Set secure cookie (always secure in Firebase App Hosting)
    response.cookies.set(process.env.SESSION_COOKIE_NAME || "session", sessionCookie, {
      httpOnly: true,
      secure: true, // Always HTTPS in Firebase App Hosting
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Session login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}