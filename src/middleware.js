import { NextResponse } from "next/server";

export async function middleware(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const sessionCookie = req.cookies.get(cookieName)?.value;

  const { pathname } = req.nextUrl;
  const publicPaths = ["/login", "/api/auth/sessionLogin", "/_next", "/static", "/favicon.ico"];

  // Allow public paths to pass through
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If there's no cookie, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Construct the absolute URL for the verification API route
  // Use the host header as a fallback for local development
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const absoluteUrl = `${protocol}://${host}/api/auth/verify`;


  // Verify the session by calling the internal API route
  try {
    const verifyRes = await fetch(absoluteUrl, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        'cache-control': 'no-cache',
      },
    });

    if (!verifyRes.ok) {
      throw new Error("Session verification fetch failed");
    }

    const { user } = await verifyRes.json();

    // Pass user info to the page via request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-uid', user.uid);
    requestHeaders.set('x-user-email', user.email || '');


    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });

  } catch (error) {
    // Session verification failed - redirect to login
    // Note: Using console.error here since middleware runs in edge runtime
    // and doesn't have access to our logger utility
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Session verification error for ${pathname}:`, error.message);
    }

    // If verification fails, clear the invalid cookie and redirect
    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(cookieName, "", { maxAge: -1, path: "/" });

    return response;
  }
}

export const config = {
  matcher: ['/((?!api/auth/sessionLogin|api/auth/|api/auth/verify|_next/static|_next/image|favicon.ico|.*\\.css).*)'],
};