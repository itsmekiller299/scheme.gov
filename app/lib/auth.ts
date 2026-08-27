import crypto from "crypto";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod-please-set-JWT_SECRET";
const JWT_EXPIRES_SEC = 7 * 24 * 60 * 60; // 7 days

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Buffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad) str += "=".repeat(4 - pad);
  return Buffer.from(str, "base64");
}

export interface JwtPayload {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "staff" | "user";
  iat: number;
  exp: number;
}

export function signToken(payload: { id: string; email: string; name?: string; role?: string }): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, role: (payload.role as any) || "user", iat: now, exp: now + JWT_EXPIRES_SEC } as JwtPayload;
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(fullPayload));
  const sig = b64urlEncode(crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export async function requireAdmin(request: NextRequest | Request): Promise<JwtPayload | null> {
  const auth = await verifyAuth(request);
  if (!auth) return null;
  if (auth.role !== "admin" && auth.role !== "staff") return null;
  return auth;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const [h, p, sig] = token.split(".");
    if (!h || !p || !sig) return null;
    const expected = b64urlEncode(crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest());
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(b64urlDecode(p).toString("utf8")) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAuth(request: NextRequest | Request): Promise<JwtPayload | null> {
  // Try cookie first (NextRequest has cookies)
  let token: string | undefined;
  if ((request as NextRequest).cookies) {
    token = (request as NextRequest).cookies.get("token")?.value;
  }
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const m = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (m) token = decodeURIComponent(m[1]);
    }
  }
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  if (!token) return null;
  return verifyToken(token);
}

export function authCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: JWT_EXPIRES_SEC,
  };
}

// Simple in-memory rate limiter (per IP + route key)
const rateMap = new Map<string, number[]>();
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  rateMap.set(key, arr);
  return true;
}
export function getClientIp(request: Request | NextRequest): string {
  return (
    (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown") as string
  );
}
