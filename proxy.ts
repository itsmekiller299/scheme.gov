import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const res = NextResponse.next();

  // Security headers (defense in depth, next.config also sets)
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Voice: allow mic on pages, deny on APIs
  if (request.nextUrl.pathname.startsWith("/api/")) {
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  } else {
    res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  }
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");

  // Prevent caching of sensitive APIs (including AI)
  if (
    request.nextUrl.pathname.startsWith("/api/applications") ||
    request.nextUrl.pathname.startsWith("/api/grievances") ||
    request.nextUrl.pathname.startsWith("/api/ai/") ||
    request.nextUrl.pathname.startsWith("/api/admin/") ||
    request.nextUrl.pathname.startsWith("/api/customer-service") ||
    request.nextUrl.pathname.startsWith("/api/upload")
  ) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
