import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { encryptText } from "@/lib/server/security/crypto";
import { getTelegramBotInfo, setTelegramWebhook } from "@/lib/server/integrations/telegram-client";
import { badRequest, withApiHandler, jsonError } from "@/lib/server/http/responses";

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);

    const body = await req.json();
    const botToken = String(body.botToken || "").trim();
    const customName = String(body.name || "").trim();

    if (!botToken) {
      throw badRequest("botToken is required");
    }

    try {
      const botInfo = await getTelegramBotInfo(botToken);

      const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || "").trim();
      const baseUrl = configuredBaseUrl || req.nextUrl.origin;

      if (!/^https:\/\//i.test(baseUrl)) {
        throw badRequest("Webhook URL must be public HTTPS. Set PUBLIC_BASE_URL (e.g. ngrok https URL) and reconnect.");
      }

      const existing = await prisma.integration.findFirst({
        where: { workspaceId: user.workspaceId, provider: "TELEGRAM" },
        orderBy: { createdAt: "asc" },
      });

      const integrationId = existing?.id ?? "tmp";
      const webhookUrl = `${baseUrl}/api/webhooks/telegram/${integrationId}`;

      const config = {
        botUsername: botInfo.username || null,
        botId: botInfo.id,
        webhookUrl,
        tokenLast4: botToken.slice(-4),
      };

      const integration = existing
        ? await prisma.integration.update({
            where: { id: existing.id },
            data: {
              name: customName || existing.name,
              status: "CONNECTED",
              credentialsEnc: encryptText(botToken),
              configJson: JSON.stringify(config),
              lastErrorAt: null,
              lastErrorMessage: null,
              lastSyncAt: new Date(),
            },
          })
        : await prisma.integration.create({
            data: {
              workspaceId: user.workspaceId,
              provider: "TELEGRAM",
              name: customName || "Main Telegram Bot",
              status: "CONNECTED",
              credentialsEnc: encryptText(botToken),
              configJson: JSON.stringify(config),
              lastSyncAt: new Date(),
            },
          });

      const finalWebhookUrl = `${baseUrl}/api/webhooks/telegram/${integration.id}`;

      try {
        await setTelegramWebhook(botToken, finalWebhookUrl);
      } catch (error) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: "ERROR",
            lastErrorAt: new Date(),
            lastErrorMessage: error instanceof Error ? error.message : "Webhook setup failed",
            configJson: JSON.stringify({ ...config, webhookUrl: finalWebhookUrl }),
          },
        });

        return NextResponse.json({
          error: "Telegram connected, but webhook setup failed",
          integration: {
            id: integration.id,
            provider: integration.provider,
            name: integration.name,
            status: "ERROR",
            credentialsMasked: `••••••••${botToken.slice(-4)}`,
            webhookUrl: finalWebhookUrl,
          },
        }, { status: 502 });
      }

      const updatedIntegration = await prisma.integration.update({
        where: { id: integration.id },
        data: { configJson: JSON.stringify({ ...config, webhookUrl: finalWebhookUrl }) },
      });

      return NextResponse.json({
        integration: {
          id: updatedIntegration.id,
          provider: updatedIntegration.provider,
          name: updatedIntegration.name,
          status: updatedIntegration.status,
          webhookUrl: finalWebhookUrl,
          credentialsMasked: `••••••••${botToken.slice(-4)}`,
        },
      });
    } catch (error) {
      return jsonError(400, error instanceof Error ? error.message : "Telegram connection failed");
    }
  });
}
