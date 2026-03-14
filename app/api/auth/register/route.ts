import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, getSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { name, email, password, workspaceName } = data;
  if (!name || !email || !password || !workspaceName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const workspace = await prisma.workspace.create({ data: { name: workspaceName } });
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });
  const token = createToken({ userId: user.id });
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  res.headers.set("Set-Cookie", getSessionCookie(token));
  return res;
}
