// app/api/auth/me/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function GET() {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const cookie = await cookies();
  const token = cookie.get(cookieName)?.value;

  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  try {
    // verify session cookie and enforce revocation check
    const decoded = await auth.verifySessionCookie(token, true);
    const userRecord = await auth.getUser(decoded.uid);
    return NextResponse.json({
      user: {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified ?? userRecord.emailVerified,
        // include custom claims or other safe properties as needed
        claims: decoded,
      },
    });
  } catch (err) {
    console.error("verifySessionCookie failed", err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}