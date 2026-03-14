import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processNormalizedMessage } from "@/lib/inbound-normalizer";

/**
 * Email ingestion webhook.
 *
 * Expects a JSON body with the following shape (forwarding/pipe integration):
 * {
 *   messageId: string,         // provider message id (e.g. RFC822 Message-ID)
 *   threadId?: string,         // provider thread id; used as externalChatId
 *   from: { name?: string, email: string },
 *   subject?: string,
 *   text?: string,
 *   html?: string,
 *   sentAt?: string,           // ISO datetime; defaults to now
 *   attachments?: Array<{ filename: string, contentType: string, size?: number }>
 * }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ integrationId: string }> }) {
  const rawBody = await req.text();
  const { integrationId } = await params;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, provider: "EMAIL" },
  });

  const eventLog = await prisma.integrationEventLog.create({
    data: {
      workspaceId: integration?.workspaceId ?? null,
      integrationId: integration?.id ?? null,
      provider: "EMAIL",
      eventType: "email_inbound",
      payloadJson: rawBody,
      processingStatus: "received",
    },
  });

  if (!integration) {
    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: { processingStatus: "failed", errorMessage: "Integration not found", processedAt: new Date() },
    });
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const fromObj = payload.from && typeof payload.from === "object"
      ? payload.from as Record<string, unknown>
      : null;

    const senderEmail = fromObj ? String(fromObj.email || "").trim() : "";
    const senderName = fromObj ? String(fromObj.name || senderEmail).trim() : senderEmail;

    if (!senderEmail) {
      await prisma.integrationEventLog.update({
        where: { id: eventLog.id },
        data: { processingStatus: "failed", errorMessage: "Missing sender email", processedAt: new Date() },
      });
      return NextResponse.json({ ok: false, error: "Missing sender email" }, { status: 400 });
    }

    const messageId = String(payload.messageId || "").trim();
    // Use threadId as external chat id for grouping; fall back to messageId, then sender email
    const threadId = String(payload.threadId || payload.messageId || senderEmail).trim();
    const subject = String(payload.subject || "").trim() || null;
    const text = typeof payload.text === "string" ? payload.text.trim() || null : null;
    const html = typeof payload.html === "string" ? payload.html.trim() || null : null;

    const sentAtRaw = payload.sentAt;
    const sentAt = sentAtRaw && typeof sentAtRaw === "string" ? new Date(sentAtRaw) : new Date();

    const result = await processNormalizedMessage(eventLog.id, {
      provider: "EMAIL",
      integrationId: integration.id,
      externalChatId: threadId,
      externalMessageId: messageId || undefined,
      externalEmail: senderEmail,
      externalName: senderName,
      subject: subject ?? undefined,
      text: text ?? undefined,
      htmlBody: html ?? undefined,
      messageType: "EMAIL",
      sentAt,
      rawPayload: payload,
    });

    return NextResponse.json({ ok: result.ok });
  } catch (error) {
    await prisma.integrationEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
        processedAt: new Date(),
      },
    });
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: "ERROR",
        lastErrorAt: new Date(),
        lastErrorMessage: error instanceof Error ? error.message : "Email processing failed",
      },
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
