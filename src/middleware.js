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
  
  console.log(`Middleware check for ${pathname}, cookie present: ${!!sessionCookie}`);
  
  if (!sessionCookie) {
    console.log(`No session cookie found for ${pathname}, redirecting to login`);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Quick verification via internal API
  try {
    const verifyRes = await fetch(new URL("/api/auth/verify", req.url), {
      headers: { 
        cookie: req.headers.get("cookie") || "",
        'cache-control': 'no-cache',
      },
    });
    
    if (!verifyRes.ok) {
      const errorData = await verifyRes.text();
      console.log(`Session verification failed for ${pathname}:`, errorData);
      throw new Error("Verification failed");
    }
    
    const { user } = await verifyRes.json();
    console.log(`✓ Session verified for ${pathname}, user: ${user.uid}`);
    
    const res = NextResponse.next();
    res.headers.set("x-user-uid", user.uid);
    res.headers.set("x-user-email", user.email || "");
    
    return res;
  } catch (error) {
    console.log(`Session verification error for ${pathname}:`, error.message);
    
    // Clear invalid cookie and redirect
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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