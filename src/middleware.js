import { NextResponse } from "next/server";

export async function middleware(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const sessionCookie = req.cookies.get(cookieName)?.value;
  
  const publicPaths = ["/login", "/api", "/_next", "/static", "/favicon.ico"];
  const pathname = req.nextUrl.pathname;
  
  // Allow public files
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Quick verification via internal API
  try {
    const verifyRes = await fetch(new URL("/api/auth/verify", req.url), {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    
    if (!verifyRes.ok) throw new Error("Verification failed");
    
    const { user } = await verifyRes.json();
    
    const res = NextResponse.next();
    res.headers.set("x-user-uid", user.uid);
    res.headers.set("x-user-email", user.email || "");
    
    return res;
  } catch (error) {
    // Clear invalid cookie and redirect
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: true, // Always true in Firebase App Hosting
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}