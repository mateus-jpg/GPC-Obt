// middleware.ts
import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const projectId = process.env.FIREBASE_PROJECT_ID;

export async function middleware(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const cookie = req.cookies.get(cookieName)?.value;
  const token = req.cookies.get(cookieName)?.value;


  const publicPaths = ["/login", "/api", "/_next", "/static", "/favicon.ico"];
  const pathname = req.nextUrl.pathname;

  // allow public files
  if (publicPaths.some(p => pathname.startsWith(p))) return NextResponse.next();

  if (!cookie) {
    console.log("no session cookie");
    // not authenticated -> redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optionally: forward cookie to origin for server verification,
  // or if you want to verify at edge, implement JWKS verification here.
  /* try {

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    console.log("payload verified");
    // ✅ token is cryptographically valid
    const res = NextResponse.next();
    res.headers.set("x-user-uid", payload.user_id );
    return res;
  } catch (err) {
    console.log("token verification failed");
    console.error(err);
    // ❌ invalid / expired token
    return NextResponse.redirect(new URL("/login", req.url));
  } */
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};


/* 
export async function middleware(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    // ✅ token is cryptographically valid
    const res = NextResponse.next();
    res.headers.set("x-user-uid", payload.user_id);
    return res;
  } catch {
    // ❌ invalid / expired token
    return NextResponse.redirect(new URL("/login", req.url));
  }
} */