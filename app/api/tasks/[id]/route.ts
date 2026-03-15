import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { notFound, withApiHandler } from "@/lib/server/http/responses";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const { id } = await params;
    const data = await req.json();
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.workspaceId !== user.workspaceId) {
      throw notFound();
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

    const updated = await prisma.task.update({ where: { id }, data: updateData });
    return NextResponse.json({ task: updated });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.workspaceId !== user.workspaceId) {
      throw notFound();
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
