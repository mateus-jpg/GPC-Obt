// app/api/sessionLogin/route.ts  (Node runtime)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req) {
  const { idToken } = await req.json();
  if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  // expiresIn must be <= 14 days recommended by Firebase
  const expiresIn = Number(process.env.SESSION_COOKIE_MAX_AGE) || 14 * 24 * 60 * 60 * 1000;

  try {
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ status: "success" });
    // set secure, httpOnly cookie
    res.cookies.set(process.env.SESSION_COOKIE_NAME || "session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: Math.floor(expiresIn / 1000),
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("sessionLogin error", err);
    return NextResponse.json({ error: "Failed to create session cookie" }, { status: 500 });
  }
}