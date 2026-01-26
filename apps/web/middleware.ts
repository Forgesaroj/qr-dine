import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const publicPaths = [
  "/",
  "/login",
  "/pin-login",
  "/forgot-password",
  "/reset-password",
];

// Guest paths (QR ordering) - /m/ for mobile guest ordering, /order/ for direct ordering
const guestPaths = ["/m/", "/order/"];

// API paths that don't require authentication
const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/pin-login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/auth/demo-role",
  "/api/guest/",
  "/api/public/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // Allow guest paths
  if (guestPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public API paths
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("access_token")?.value;

  // If no token and trying to access protected route, redirect to login
  if (!token && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If no token and trying to access protected API, return 401
  if (!token && pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "E1001",
          message: "Unauthorized",
        },
      },
      { status: 401 }
    );
  }

  // TODO: Add token verification in Step 6
  // For now, just pass through if token exists

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (files with extensions like .png, .js, .json)
     * - icons directory
     * - manifest.json
     * - sw.js (service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|.*\\.[^/]+$|api/health).*)",
  ],
};
