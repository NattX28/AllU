import { NextRequest, NextResponse } from "next/server";

function decodeJWTPayload(token: string): Record<string, string> | null {
  try {
    const base64 = token.split(".")[1];
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json);
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

  const accessToken =
    request.headers.get("x-access-token") ??
    request.cookies.get("access_token_hint")?.value ??
    null;

  // ไม่มี cookie เลย → ยังไม่เคย login → redirect ไป login
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // มี cookie → decode เพื่ออ่าน role เท่านั้น ไม่ตรวจ exp
  // (AuthContext จะ refresh token เองถ้าหมดอายุ)
  const payload = decodeJWTPayload(accessToken);
  if (!payload?.role) {
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

  // Guard: ป้องกัน role อื่นเข้า route ที่ไม่ใช่ของตัวเอง
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
