import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const provider = url.searchParams.get("provider");
  const assignedTo = url.searchParams.get("assignedTo");
  const linked = url.searchParams.get("linked");
  const search = (url.searchParams.get("search") || "").trim();

  const where: {
    workspaceId: string;
    provider?: "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM";
    assignedTo?: string | null;
    isRead?: boolean;
    isResolved?: boolean;
    OR?: Array<Record<string, unknown>>;
    AND?: Array<Record<string, unknown>>;
  } = {
    workspaceId: user.workspaceId,
  };

  if (provider && ["TELEGRAM", "WHATSAPP", "EMAIL", "WEBHOOK", "FORM"].includes(provider)) {
    where.provider = provider as "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM";
  }

  if (assignedTo === "unassigned") {
    where.assignedTo = null;
  } else if (assignedTo) {
    where.assignedTo = assignedTo;
  }

  if (status === "unread") where.isRead = false;
  if (status === "resolved") where.isResolved = true;
  if (status === "unresolved") where.isResolved = false;

  if (linked === "linked") {
    where.AND = [{ OR: [{ contactId: { not: null } }, { leadId: { not: null } }] }];
  }

  if (linked === "unlinked") {
    where.AND = [{ contactId: null, leadId: null }];
  }

  if (search) {
    where.OR = [
      { externalName: { contains: search } },
      { externalUsername: { contains: search } },
      { lastMessagePreview: { contains: search } },
      { externalChatId: { contains: search } },
      { externalEmail: { contains: search } },
      { externalPhone: { contains: search } },
      { subject: { contains: search } },
    ];
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      integration: true,
      contact: true,
      lead: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ conversations });
}
