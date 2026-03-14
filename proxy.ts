import { NextRequest, NextResponse } from "next/server";
import jwt from "jwt-simple";

const COOKIE_NAME = "crm_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = jwt.decode(token, JWT_SECRET) as { userId?: string } | null;
    return Boolean(decoded?.userId);
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isAuthed = isValidSessionToken(token);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isPublicHome = pathname === "/";

  if (isAuthPage && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isPublicHome && !isAuthPage && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
