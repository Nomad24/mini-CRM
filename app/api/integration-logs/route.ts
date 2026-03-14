import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integrationId") || undefined;
  const provider = url.searchParams.get("provider") || undefined;
  const processingStatus = url.searchParams.get("processingStatus") || undefined;
  const search = (url.searchParams.get("search") || "").trim();

  const where: {
    workspaceId: string;
    integrationId?: string;
    provider?: "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM";
    processingStatus?: string;
    OR?: Array<Record<string, unknown>>;
  } = {
    workspaceId: user.workspaceId,
    integrationId,
    provider: provider && ["TELEGRAM", "WHATSAPP", "EMAIL", "WEBHOOK", "FORM"].includes(provider)
      ? provider as "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM"
      : undefined,
  };

  if (processingStatus && ["received", "processed", "ignored", "failed"].includes(processingStatus)) {
    where.processingStatus = processingStatus;
  }

  if (search) {
    where.OR = [
      { eventType: { contains: search } },
      { errorMessage: { contains: search } },
      { integration: { name: { contains: search } } },
    ];
  }

  const logs = await prisma.integrationEventLog.findMany({
    where,
    include: {
      integration: { select: { id: true, name: true, provider: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
}
