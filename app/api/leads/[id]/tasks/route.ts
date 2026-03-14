import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const { title, description, dueDate, assignedTo } = data;
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
  const lead = await prisma.lead.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || user.id,
      workspaceId: user.workspaceId,
      leadId: lead.id,
    },
  });
  return NextResponse.json({ task });
}
