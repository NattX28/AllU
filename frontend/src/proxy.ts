import { NextRequest, NextResponse } from "next/server";

function decodeJWTPayload(token: string): Record<string, string> | null {
  try {
    const base64 = token.split(".")[1];
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(json);

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

const ROLE_HOME: Record<string, string> = {
  student: "/dashboard",
  professor: "/professor/dashboard",
  admin: "/admin/users",
};

// Route prefixes protected per role
const PROTECTED: Record<string, string[]> = {
  student: ["/dashboard", "/registration", "/schedule", "/grades", "/profile"],
  professor: ["/professor"],
  admin: ["/admin"],
};

// ชื่อ cookie ของ refresh token ที่ backend ตั้งไว้ (HttpOnly)
// เปลี่ยนให้ตรงกับชื่อจริงของ backend
const REFRESH_TOKEN_COOKIE = "refresh_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Try to read access token from Authorization header (set by server components)
  const accessToken =
    request.headers.get("x-access-token") ??
    request.cookies.get("access_token_hint")?.value ??
    null;

  const payload = accessToken ? decodeJWTPayload(accessToken) : null;

  if (!payload || !payload.role) {
    // access token ไม่มีหรือหมดอายุ — ตรวจว่ายังมี refresh token อยู่ไหม
    // ถ้ามี ให้ผ่านไปก่อน แล้วปล่อยให้ AuthContext call /auth/refresh เอง
    const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (hasRefreshToken) {
      return NextResponse.next();
    }

    // ไม่มีทั้งคู่ → redirect ไป login จริงๆ
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = payload.role as string;

  // Redirect root → role home
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(ROLE_HOME[role] ?? "/login", request.url),
    );
  }

  // Guard: student can't access /admin, /professor etc.
  for (const [r, prefixes] of Object.entries(PROTECTED)) {
    if (r !== role) {
      for (const prefix of prefixes) {
        if (pathname.startsWith(prefix)) {
          return NextResponse.redirect(
            new URL(ROLE_HOME[role] ?? "/login", request.url),
          );
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
