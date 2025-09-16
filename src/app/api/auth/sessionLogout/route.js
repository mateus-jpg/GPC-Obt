import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "session";
    const sessionCookie = req.cookies.get(cookieName)?.value;
    
    if (sessionCookie) {
      try {
        // Verify and revoke the session
        const decodedToken = await auth.verifySessionCookie(sessionCookie);
        await auth.revokeRefreshTokens(decodedToken.uid);
      } catch (error) {
        console.error("Error revoking session:", error);
        // Continue with logout even if revocation fails
      }
    }
    
    const response = NextResponse.json({ success: true });
    
    // Clear the cookie
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: true, // Always HTTPS in Firebase App Hosting
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Session logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}