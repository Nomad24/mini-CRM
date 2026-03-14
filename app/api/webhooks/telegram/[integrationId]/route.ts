import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getMessageType(message: Record<string, unknown>) {
  if (typeof message.text === "string") return "TEXT" as const;
  if (message.photo) return "IMAGE" as const;
  if (message.document) return "FILE" as const;
  if (message.audio || message.voice) return "AUDIO" as const;
  if (message.video || message.video_note) return "VIDEO" as const;
  return "SYSTEM" as const;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ integrationId: string }> }) {
  const payload = await req.json().catch(() => null);
  const { integrationId } = await params;

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, provider: "TELEGRAM" },
  });

  const eventLog = await prisma.integrationEventLog.create({
    data: {
      workspaceId: integration?.workspaceId ?? null,
      integrationId: integration?.id ?? null,
      provider: "TELEGRAM",
      eventType: "telegram_update",
      payloadJson: JSON.stringify(payload ?? {}),
      processingStatus: "received",
    },
  });

  if (!integration) {
    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: "failed",
        errorMessage: "Integration not found",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: false, error: "Integration not found" }, { status: 404 });
  }

  if (integration.status !== "CONNECTED") {
    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: "ignored",
        errorMessage: `Integration status is ${integration.status}`,
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const message = (payload?.message || payload?.edited_message || null) as Record<string, unknown> | null;

    if (!message || typeof message !== "object") {
      await prisma.integrationEventLog.update({
        where: { id: eventLog.id },
        data: { processingStatus: "ignored", processedAt: new Date(), errorMessage: "Unsupported telegram event" },
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const chat = (message.chat || {}) as Record<string, unknown>;
    const from = (message.from || {}) as Record<string, unknown>;

    const externalChatId = String(chat.id ?? "");
    if (!externalChatId) {
      await prisma.integrationEventLog.update({
        where: { id: eventLog.id },
        data: { processingStatus: "failed", processedAt: new Date(), errorMessage: "Missing chat id" },
      });
      return NextResponse.json({ ok: false, error: "Missing chat id" }, { status: 400 });
    }

    const conversation = await prisma.conversation.upsert({
      where: { integrationId_externalChatId: { integrationId: integration.id, externalChatId } },
      update: {
        externalUserId: from.id ? String(from.id) : null,
        externalUsername: from.username ? String(from.username) : null,
        externalName: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
      },
      create: {
        workspaceId: integration.workspaceId,
        integrationId: integration.id,
        provider: "TELEGRAM",
        externalChatId,
        externalUserId: from.id ? String(from.id) : null,
        externalUsername: from.username ? String(from.username) : null,
        externalName: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
      },
    });

    const externalMessageId = message.message_id ? String(message.message_id) : null;

    if (externalMessageId) {
      const existing = await prisma.message.findFirst({ where: { conversationId: conversation.id, externalMessageId } });
      if (existing) {
        await prisma.integrationEventLog.update({
          where: { id: eventLog.id },
          data: { processingStatus: "processed", processedAt: new Date() },
        });
        await prisma.integration.update({
          where: { id: integration.id },
          data: { lastSyncAt: new Date() },
        });
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    const messageType = getMessageType(message);
    const text = typeof message.text === "string"
      ? message.text
      : typeof message.caption === "string"
        ? message.caption
        : null;

    const sentAt = typeof message.date === "number" ? new Date(message.date * 1000) : new Date();

    await prisma.message.create({
      data: {
        workspaceId: integration.workspaceId,
        conversationId: conversation.id,
        provider: "TELEGRAM",
        externalMessageId,
        direction: "INBOUND",
        messageType,
        senderName: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
        senderHandle: from.username ? String(from.username) : null,
        text,
        rawPayloadJson: JSON.stringify(message),
        sentAt,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: sentAt,
        lastMessagePreview: text ? text.slice(0, 280) : `[${messageType}]`,
        isRead: false,
      },
    });

    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: "processed",
        processedAt: new Date(),
      },
    });

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Webhook processing failed",
        processedAt: new Date(),
      },
    });

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: "ERROR",
        lastErrorAt: new Date(),
        lastErrorMessage: error instanceof Error ? error.message : "Webhook processing failed",
      },
    });

    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
