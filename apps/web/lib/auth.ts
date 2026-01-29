import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "qrdine-dev-secret-change-in-production"
);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  restaurantId: string;
  restaurantSlug: string;
}

export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  const session = await verifyToken(token);

  if (!session) return null;

  // Check for demo role override (DEV ONLY - remove in production)
  const demoRoleOverride = cookieStore.get("demo_role_override")?.value;
  if (demoRoleOverride) {
    const validRoles = ["OWNER", "MANAGER", "WAITER", "KITCHEN", "HOST"];
    if (validRoles.includes(demoRoleOverride)) {
      return { ...session, role: demoRoleOverride };
    }
  }

  return session;
}

// Check if HTTPS is required for cookies
// Set REQUIRE_HTTPS=false for local network deployments over HTTP
const isSecureCookie = process.env.NODE_ENV === "production" && process.env.REQUIRE_HTTPS !== "false";

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export function buildCookieHeader(accessToken: string, refreshToken: string): string[] {
  const secureFlag = isSecureCookie ? "; Secure" : "";
  const accessCookie = `access_token=${accessToken}; HttpOnly; Path=/; Max-Age=${60 * 15}; SameSite=Lax${secureFlag}`;
  const refreshCookie = `refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secureFlag}`;
  return [accessCookie, refreshCookie];
}

// Note: For clearing cookies in API routes, set them on the response directly
// with Max-Age=0 instead of using this function
