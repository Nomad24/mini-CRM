import { prisma } from "@/lib/prisma";

export type NormalizedInboundMessage = {
  provider: "WHATSAPP" | "EMAIL";
  integrationId: string;
  externalChatId: string;
  externalMessageId?: string;
  externalUserId?: string;
  externalName?: string;
  externalUsername?: string;
  externalEmail?: string;
  externalPhone?: string;
  subject?: string;
  text?: string;
  htmlBody?: string;
  messageType: "TEXT" | "IMAGE" | "FILE" | "AUDIO" | "VIDEO" | "EMAIL" | "SYSTEM";
  sentAt: Date;
  rawPayload: unknown;
};

export async function processNormalizedMessage(
  eventLogId: string,
  normalized: NormalizedInboundMessage,
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const integration = await prisma.integration.findFirst({
    where: { id: normalized.integrationId, provider: normalized.provider },
  });

  if (!integration) {
    await prisma.integrationEventLog.update({
      where: { id: eventLogId },
      data: { processingStatus: "failed", errorMessage: "Integration not found", processedAt: new Date() },
    });
    return { ok: false, error: "Integration not found" };
  }

  if (integration.status !== "CONNECTED") {
    await prisma.integrationEventLog.update({
      where: { id: eventLogId },
      data: {
        processingStatus: "ignored",
        errorMessage: `Integration status is ${integration.status}`,
        processedAt: new Date(),
      },
    });
    return { ok: true };
  }

  // Deduplicate by externalMessageId
  if (normalized.externalMessageId) {
    const existing = await prisma.message.findFirst({
      where: {
        workspaceId: integration.workspaceId,
        provider: normalized.provider,
        externalMessageId: normalized.externalMessageId,
      },
    });
    if (existing) {
      await prisma.integrationEventLog.update({
        where: { id: eventLogId },
        data: { processingStatus: "processed", processedAt: new Date() },
      });
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });
      return { ok: true, duplicate: true };
    }
  }

  // Upsert conversation
  const conversationData = {
    externalUserId: normalized.externalUserId ?? null,
    externalUsername: normalized.externalUsername ?? null,
    externalName: normalized.externalName ?? null,
    externalEmail: normalized.externalEmail ?? null,
    externalPhone: normalized.externalPhone ?? null,
    subject: normalized.subject ?? null,
  };

  const conversation = await prisma.conversation.upsert({
    where: {
      integrationId_externalChatId: {
        integrationId: integration.id,
        externalChatId: normalized.externalChatId,
      },
    },
    update: conversationData,
    create: {
      workspaceId: integration.workspaceId,
      integrationId: integration.id,
      provider: normalized.provider,
      externalChatId: normalized.externalChatId,
      ...conversationData,
    },
  });

  // Auto-link contact if phone/email matches
  if (!conversation.contactId) {
    let autoContact = null;
    if (normalized.externalPhone) {
      autoContact = await prisma.contact.findFirst({
        where: { workspaceId: integration.workspaceId, phone: normalized.externalPhone },
      });
    }
    if (!autoContact && normalized.externalEmail) {
      autoContact = await prisma.contact.findFirst({
        where: { workspaceId: integration.workspaceId, email: normalized.externalEmail },
      });
    }
    if (autoContact) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactId: autoContact.id },
      });
    }
  }

  const preview =
    normalized.text
      ? normalized.text.slice(0, 280)
      : normalized.subject
        ? `[Email] ${normalized.subject.slice(0, 270)}`
        : `[${normalized.messageType}]`;

  await prisma.message.create({
    data: {
      workspaceId: integration.workspaceId,
      conversationId: conversation.id,
      provider: normalized.provider,
      externalMessageId: normalized.externalMessageId ?? null,
      direction: "INBOUND",
      messageType: normalized.messageType,
      senderName: normalized.externalName ?? null,
      senderEmail: normalized.externalEmail ?? null,
      senderPhone: normalized.externalPhone ?? null,
      subject: normalized.subject ?? null,
      text: normalized.text ?? null,
      htmlBody: normalized.htmlBody ?? null,
      rawPayloadJson: JSON.stringify(normalized.rawPayload),
      sentAt: normalized.sentAt,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: normalized.sentAt,
      lastMessagePreview: preview,
      isRead: false,
      subject: normalized.subject ?? conversation.subject ?? null,
    },
  });

  await prisma.integrationEventLog.update({
    where: { id: eventLogId },
    data: { processingStatus: "processed", processedAt: new Date() },
  });

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return { ok: true };
}
