import { NextResponse } from "next/server";
import { getCachedSession, setCachedSession } from "@/utils/session-cache";

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

  // Check session cache first (reduces /api/auth/verify calls)
  const cachedUser = getCachedSession(sessionCookie);
  if (cachedUser) {
    // Cache hit - use cached user data
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-uid', cachedUser.uid);
    requestHeaders.set('x-user-email', cachedUser.email || '');
    // Pass additional cached data to reduce downstream fetches
    if (cachedUser.role) {
      requestHeaders.set('x-user-role', cachedUser.role);
    }
    if (cachedUser.structureIds) {
      requestHeaders.set('x-user-structures', JSON.stringify(cachedUser.structureIds));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  // Cache miss - verify session via API
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const absoluteUrl = `${protocol}://${host}/api/auth/verify`;

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

    // Cache the verified session for future requests
    setCachedSession(sessionCookie, user);

    // Pass user info to the page via request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-uid', user.uid);
    requestHeaders.set('x-user-email', user.email || '');
    // Pass additional data to reduce downstream fetches
    if (user.role) {
      requestHeaders.set('x-user-role', user.role);
    }
    if (user.structureIds) {
      requestHeaders.set('x-user-structures', JSON.stringify(user.structureIds));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });

  } catch (error) {
    // Session verification failed - redirect to login
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
