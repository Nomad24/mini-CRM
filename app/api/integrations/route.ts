import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await prisma.integration.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      eventLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({
    integrations: integrations.map((integration) => {
      let config: Record<string, unknown> = {};
      if (integration.configJson) {
        try {
          config = JSON.parse(integration.configJson);
        } catch {
          config = {};
        }
      }

      const tokenLast4 = String(config.tokenLast4 || "");
      const credentialsMasked = typeof config.credentialsMasked === "string"
        ? config.credentialsMasked
        : tokenLast4
          ? `••••••••${tokenLast4}`
          : null;
      return {
        id: integration.id,
        provider: integration.provider,
        name: integration.name,
        status: integration.status,
        lastSyncAt: integration.lastSyncAt,
        lastErrorAt: integration.lastErrorAt,
        lastErrorMessage: integration.lastErrorMessage,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        lastEventAt: integration.eventLogs[0]?.createdAt ?? null,
        lastEventStatus: integration.eventLogs[0]?.processingStatus ?? null,
        config,
        credentialsMasked,
      };
    }),
  });
}
