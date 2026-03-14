import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { id: true, name: true, createdAt: true },
  });
  const usersCount = await prisma.user.count({ where: { workspaceId: user.workspaceId } });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    },
    workspace,
    usersCount,
  });
}
