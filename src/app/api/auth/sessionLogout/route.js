// app/api/sessionLogout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function POST(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const sessionCookie = req.cookies.get(cookieName)?.value;
  if (sessionCookie) {
    try {
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      // revoke tokens
      await auth.revokeRefreshTokens(decoded.uid);
    } catch (e) {
      // ignore; still clear cookie
    }
  }

  const res = NextResponse.json({ status: "logged_out" });
  res.cookies.delete(cookieName, { path: "/" });
  return res;
}