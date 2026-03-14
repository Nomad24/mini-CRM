import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.workspaceId !== user.workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.note.update({ where: { id }, data: { content } });
  return NextResponse.json({ note: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.workspaceId !== user.workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
