import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      integration: true,
      contact: true,
      lead: true,
      assignee: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const users = await prisma.user.findMany({
    where: { workspaceId: user.workspaceId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ conversation, users });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  let assignedTo = conversation.assignedTo;
  if (body.assignedTo !== undefined) {
    if (body.assignedTo === null || body.assignedTo === "") {
      assignedTo = null;
    } else {
      const assignee = await prisma.user.findFirst({ where: { id: String(body.assignedTo), workspaceId: user.workspaceId } });
      if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      assignedTo = assignee.id;
    }
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      isRead: body.isRead !== undefined ? Boolean(body.isRead) : conversation.isRead,
      isResolved: body.isResolved !== undefined ? Boolean(body.isResolved) : conversation.isResolved,
      assignedTo,
    },
    include: {
      integration: true,
      contact: true,
      lead: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ conversation: updated });
}
