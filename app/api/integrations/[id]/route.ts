import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const integration = await prisma.integration.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const name = body.name !== undefined ? String(body.name).trim() : integration.name;

  const updated = await prisma.integration.update({
    where: { id },
    data: {
      name,
      configJson: body.configJson !== undefined ? JSON.stringify(body.configJson) : integration.configJson,
    },
  });

  return NextResponse.json({ integration: updated });
}
