import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const accessToken = String(body.accessToken || "").trim();
  const phoneNumberId = String(body.phoneNumberId || "").trim();
  const verifyToken = String(body.verifyToken || "").trim();
  const businessAccountId = String(body.businessAccountId || "").trim();
  const appSecret = String(body.appSecret || "").trim();
  const customName = String(body.name || "").trim();

  if (!accessToken) return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
  if (!phoneNumberId) return NextResponse.json({ error: "phoneNumberId is required" }, { status: 400 });
  if (!verifyToken) return NextResponse.json({ error: "verifyToken is required" }, { status: 400 });

  const existing = await prisma.integration.findFirst({
    where: { workspaceId: user.workspaceId, provider: "WHATSAPP" },
    orderBy: { createdAt: "asc" },
  });

  const configJson = JSON.stringify({
    phoneNumberId,
    businessAccountId: businessAccountId || null,
    tokenLast4: accessToken.slice(-4),
    credentialsMasked: `••••••••${accessToken.slice(-4)}`,
    verifyToken,
    hasAppSecret: Boolean(appSecret),
  });

  const credentials = JSON.stringify({
    accessToken,
    appSecret: appSecret || null,
  });

  const integration = existing
    ? await prisma.integration.update({
        where: { id: existing.id },
        data: {
          name: customName || existing.name,
          status: "CONNECTED",
          credentialsEnc: encryptText(credentials),
          configJson,
          lastErrorAt: null,
          lastErrorMessage: null,
          lastSyncAt: new Date(),
        },
      })
    : await prisma.integration.create({
        data: {
          workspaceId: user.workspaceId,
          provider: "WHATSAPP",
          name: customName || "Main WhatsApp",
          status: "CONNECTED",
          credentialsEnc: encryptText(credentials),
          configJson,
          lastSyncAt: new Date(),
        },
      });

  const baseUrl = (process.env.PUBLIC_BASE_URL || req.nextUrl.origin).trim();
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp/${integration.id}`;

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
      webhookUrl,
      credentialsMasked: `••••••••${accessToken.slice(-4)}`,
      phoneNumberId,
    },
  });
}
