import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const customName = String(body.name || "").trim();
  const sourceType = String(body.sourceType || "forwarding").trim();
  const inboxAddress = String(body.inboxAddress || "").trim();
  const config = body.config && typeof body.config === "object" ? body.config as Record<string, unknown> : {};

  const allowedTypes = ["forwarding", "gmail", "outlook"];
  if (!allowedTypes.includes(sourceType)) {
    return NextResponse.json({ error: "sourceType must be one of: forwarding, gmail, outlook" }, { status: 400 });
  }

  const existing = await prisma.integration.findFirst({
    where: { workspaceId: user.workspaceId, provider: "EMAIL" },
    orderBy: { createdAt: "asc" },
  });

  const configJson = JSON.stringify({
    sourceType,
    inboxAddress: inboxAddress || null,
    credentialsMasked: inboxAddress ? inboxAddress : `${sourceType} email`,
    ...config,
  });

  const credentialsPayload = JSON.stringify({ sourceType, inboxAddress: inboxAddress || null });

  const integration = existing
    ? await prisma.integration.update({
        where: { id: existing.id },
        data: {
          name: customName || existing.name,
          status: "CONNECTED",
          credentialsEnc: encryptText(credentialsPayload),
          configJson,
          lastErrorAt: null,
          lastErrorMessage: null,
          lastSyncAt: new Date(),
        },
      })
    : await prisma.integration.create({
        data: {
          workspaceId: user.workspaceId,
          provider: "EMAIL",
          name: customName || "Main Email",
          status: "CONNECTED",
          credentialsEnc: encryptText(credentialsPayload),
          configJson,
          lastSyncAt: new Date(),
        },
      });

  const baseUrl = (process.env.PUBLIC_BASE_URL || req.nextUrl.origin).trim();
  const webhookUrl = `${baseUrl}/api/webhooks/email/${integration.id}`;

  await prisma.integration.update({
    where: { id: integration.id },
    data: { configJson: JSON.stringify({ ...JSON.parse(configJson), webhookUrl }) },
  });

  return NextResponse.json({
    integration: {
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      sourceType,
      inboxAddress: inboxAddress || null,
      webhookUrl,
    },
  });
}
