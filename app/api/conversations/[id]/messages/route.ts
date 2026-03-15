import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { decryptText } from "@/lib/server/security/crypto";
import { sendTelegramMessage } from "@/lib/server/integrations/telegram-client";
import { ApiError, badRequest, notFound, withApiHandler, jsonError, jsonServerError } from "@/lib/server/http/responses";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);

    const { id } = await params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { integration: true },
    });

    if (!conversation) throw notFound("Conversation not found");
    if (conversation.integration.status !== "CONNECTED") {
      throw badRequest("Integration is not connected");
    }
    if (!conversation.integration.credentialsEnc) {
      throw badRequest("Integration credentials are missing");
    }

    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) throw badRequest("Message text is required");

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
        throw badRequest(`Outbound replies are not supported for ${conversation.provider}`);
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
      if (error instanceof ApiError) {
        return jsonError(error.status, error.message);
      }

      await prisma.integration.update({
        where: { id: conversation.integration.id },
        data: {
          status: "ERROR",
          lastErrorAt: new Date(),
          lastErrorMessage: error instanceof Error ? error.message : "Failed to send outbound message",
        },
      });

      return jsonServerError(error, "Failed to send outbound message");
    }
  });
}
