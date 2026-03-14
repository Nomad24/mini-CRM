import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const leadId = String(body.leadId || "");

  const conversation = await prisma.conversation.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: user.workspaceId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { leadId: lead.id, contactId: conversation.contactId ?? lead.contactId },
    include: { contact: true, lead: true, assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ conversation: updated });
}
