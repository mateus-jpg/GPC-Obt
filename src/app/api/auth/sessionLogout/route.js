import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "session";
    const sessionCookie = req.cookies.get(cookieName)?.value;

    // Create response first
    const response = NextResponse.json({ success: true });

    // Always clear the cookie, regardless of whether we can verify/revoke it
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    if (sessionCookie) {
      try {
        // Verify and revoke the session
        const decodedToken = await auth.verifySessionCookie(sessionCookie);
        await auth.revokeRefreshTokens(decodedToken.uid);
        
        console.log(`Successfully revoked tokens for user: ${decodedToken.uid}`);
      } catch (error) {
        console.error("Error revoking session:", error);
        // Continue with logout even if revocation fails
        // The cookie is still cleared above
      }
    }

    return response;
  } catch (error) {
    console.error("Session logout error:", error);
    
    // Even if there's an error, try to clear the cookie
    const response = NextResponse.json({ error: "Logout failed" }, { status: 500 });
    response.cookies.set(process.env.SESSION_COOKIE_NAME || "session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  }
}