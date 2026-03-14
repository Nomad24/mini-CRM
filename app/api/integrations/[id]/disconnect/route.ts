import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const integration = await prisma.integration.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.integration.update({
    where: { id },
    data: { status: "DISCONNECTED" },
  });

  return NextResponse.json({ ok: true, integration: updated });
}
