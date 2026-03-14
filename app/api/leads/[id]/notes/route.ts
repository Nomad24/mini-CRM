import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });
  const lead = await prisma.lead.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const note = await prisma.note.create({
    data: {
      content,
      leadId: lead.id,
      authorId: user.id,
      workspaceId: user.workspaceId,
    },
    include: { author: true },
  });
  return NextResponse.json({ note });
}
