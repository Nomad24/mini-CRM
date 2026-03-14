import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import { processNormalizedMessage } from "@/lib/inbound-normalizer";
import { createHmac, timingSafeEqual } from "crypto";

function waMessageType(msg: Record<string, unknown>): "TEXT" | "IMAGE" | "FILE" | "AUDIO" | "VIDEO" | "SYSTEM" {
  const type = String(msg.type || "");
  if (type === "text") return "TEXT";
  if (type === "image") return "IMAGE";
  if (type === "audio" || type === "voice") return "AUDIO";
  if (type === "video") return "VIDEO";
  if (type === "document") return "FILE";
  return "SYSTEM";
}

function verifySignature(payload: string, appSecret: string, signature: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

// WhatsApp webhook verification (GET)
export async function GET(req: NextRequest, { params }: { params: Promise<{ integrationId: string }> }) {
  const { integrationId } = await params;
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, provider: "WHATSAPP" },
  });

  if (!integration) return new NextResponse("Not Found", { status: 404 });

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(integration.configJson || "{}"); } catch { /* */ }

  if (!config.verifyToken || config.verifyToken !== token) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

// WhatsApp webhook ingestion (POST)
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
    where: { id: integrationId, provider: "WHATSAPP" },
  });

  const eventLog = await prisma.integrationEventLog.create({
    data: {
      workspaceId: integration?.workspaceId ?? null,
      integrationId: integration?.id ?? null,
      provider: "WHATSAPP",
      eventType: "whatsapp_webhook",
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

  // Optional signature verification
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(integration.configJson || "{}"); } catch { /* */ }

  if (config.hasAppSecret && integration.credentialsEnc) {
    try {
      const creds = JSON.parse(decryptText(integration.credentialsEnc)) as Record<string, unknown>;
      const appSecret = String(creds.appSecret || "");
      const signature = req.headers.get("x-hub-signature-256") || "";
      if (appSecret && !verifySignature(rawBody, appSecret, signature)) {
        await prisma.integrationEventLog.update({
          where: { id: eventLog.id },
          data: { processingStatus: "failed", errorMessage: "Invalid signature", processedAt: new Date() },
        });
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      // If decryption fails, proceed anyway to not break processing
    }
  }

  try {
    // WhatsApp Cloud API event structure
    const entry = Array.isArray(payload.entry) ? payload.entry[0] : null;
    const changes = entry && Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])[0]
      : null;
    const value = changes && typeof (changes as Record<string, unknown>).value === "object"
      ? (changes as Record<string, unknown>).value as Record<string, unknown>
      : null;

    const messages = value && Array.isArray(value.messages) ? value.messages as Record<string, unknown>[] : [];
    const contacts = value && Array.isArray(value.contacts) ? value.contacts as Record<string, unknown>[] : [];

    if (messages.length === 0) {
      await prisma.integrationEventLog.update({
        where: { id: eventLog.id },
        data: { processingStatus: "ignored", errorMessage: "No messages in payload", processedAt: new Date() },
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    const msg = messages[0];
    const waContact = contacts[0] as Record<string, unknown> | undefined;
    const senderPhone = String(msg.from || "");
    const externalMessageId = String(msg.id || "");
    const sentAt = typeof msg.timestamp === "string" || typeof msg.timestamp === "number"
      ? new Date(Number(msg.timestamp) * 1000)
      : new Date();

    const contactName = waContact
      ? String((waContact.profile as Record<string, unknown> | undefined)?.name || senderPhone)
      : senderPhone;

    const msgType = waMessageType(msg);
    const textObj = typeof msg.text === "object" && msg.text !== null ? msg.text as Record<string, unknown> : null;
    const text = textObj ? String(textObj.body || "") || null : null;

    const result = await processNormalizedMessage(eventLog.id, {
      provider: "WHATSAPP",
      integrationId: integration.id,
      externalChatId: senderPhone,
      externalMessageId: externalMessageId || undefined,
      externalPhone: senderPhone || undefined,
      externalName: contactName || undefined,
      messageType: msgType,
      text: text ?? undefined,
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
        lastErrorMessage: error instanceof Error ? error.message : "Webhook processing failed",
      },
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
