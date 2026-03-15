import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { withApiHandler } from "@/lib/server/http/responses";

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const tasks = await prisma.task.findMany({
      where: { workspaceId: user.workspaceId },
      include: {
        lead: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ tasks });
  });
}
