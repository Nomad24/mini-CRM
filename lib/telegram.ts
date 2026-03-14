export async function getTelegramBotInfo(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await response.json();

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || "Telegram token validation failed");
  }

  return data.result as { id: number; username?: string; first_name?: string };
}

export async function setTelegramWebhook(botToken: string, webhookUrl: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || "Failed to set Telegram webhook");
  }

  return true;
}

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description || "Failed to send Telegram message");
  }

  return data.result as {
    message_id: number;
    date: number;
    text?: string;
  };
}
