import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createToken, getSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { email, password } = data;
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !comparePassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = createToken({ userId: user.id });
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  res.headers.set("Set-Cookie", getSessionCookie(token));
  return res;
}
