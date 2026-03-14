import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const name = String(data?.name ?? "").trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Workspace name must be at least 2 characters." }, { status: 400 });
  }

  const workspace = await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: { name },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ workspace });
}
