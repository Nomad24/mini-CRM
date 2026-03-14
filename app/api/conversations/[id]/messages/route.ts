import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decryptText } from "@/lib/crypto";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { integration: true },
  });

  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (conversation.integration.status !== "CONNECTED") {
    return NextResponse.json({ error: "Integration is not connected" }, { status: 400 });
  }
  if (!conversation.integration.credentialsEnc) {
    return NextResponse.json({ error: "Integration credentials are missing" }, { status: 400 });
  }

  const body = await req.json();
  const text = String(body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message text is required" }, { status: 400 });

  try {
    let externalMessageId: string | null = null;
    let sentAt = new Date();
    let rawPayload: Record<string, unknown> = { provider: conversation.provider };

    if (conversation.provider === "TELEGRAM") {
      const botToken = decryptText(conversation.integration.credentialsEnc);
      const telegramMessage = await sendTelegramMessage(botToken, conversation.externalChatId, text);
      externalMessageId = String(telegramMessage.message_id);
      sentAt = telegramMessage.date ? new Date(telegramMessage.date * 1000) : new Date();
      rawPayload = telegramMessage as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: `Outbound replies are not supported for ${conversation.provider}` }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        workspaceId: user.workspaceId,
        conversationId: conversation.id,
        provider: conversation.provider,
        externalMessageId,
        direction: "OUTBOUND",
        messageType: "TEXT",
        senderName: user.name,
        senderHandle: null,
        text,
        rawPayloadJson: JSON.stringify(rawPayload),
        sentAt,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: sentAt,
        lastMessagePreview: text.slice(0, 280),
        isRead: true,
      },
    });

    await prisma.integration.update({
      where: { id: conversation.integration.id },
      data: {
        lastSyncAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    await prisma.integration.update({
      where: { id: conversation.integration.id },
      data: {
        status: "ERROR",
        lastErrorAt: new Date(),
        lastErrorMessage: error instanceof Error ? error.message : "Failed to send outbound message",
      },
    });

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send outbound message" }, { status: 500 });
  }
}
