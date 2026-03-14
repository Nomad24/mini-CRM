"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Integration = {
  id: string;
  provider: "TELEGRAM";
  name: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  credentialsMasked?: string | null;
  config?: { webhookUrl?: string; botUsername?: string };
  lastSyncAt?: string | null;
  lastEventAt?: string | null;
  lastEventStatus?: string | null;
  lastErrorMessage?: string | null;
};

export default function TelegramIntegrationPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("Main Telegram Bot");
  const [botToken, setBotToken] = useState("");

  async function loadIntegration() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      const tg = (data.integrations || []).find((item: Integration) => item.provider === "TELEGRAM") || null;
      setIntegration(tg);
      if (tg?.name) setName(tg.name);
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadIntegration();
    });
  }, []);

  const connectLabel = useMemo(() => (integration ? "Reconnect" : "Connect"), [integration]);

  const onConnect = async () => {
    if (!botToken.trim()) {
      showToast("Bot token is required", "error");
      return;
    }

    setIsSaving(true);
    const res = await fetch("/api/integrations/telegram/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken: botToken.trim(), name: name.trim() || "Main Telegram Bot" }),
    });
    setIsSaving(false);

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to connect Telegram", "error");
      return;
    }

    showToast("Telegram integration saved", "success");
    setBotToken("");
    await loadIntegration();
  };

  const onDisconnect = async () => {
    if (!integration) return;
    setIsSaving(true);
    const res = await fetch(`/api/integrations/${integration.id}/disconnect`, { method: "POST" });
    setIsSaving(false);
    if (!res.ok) {
      showToast("Failed to disconnect integration", "error");
      return;
    }
    showToast("Integration disconnected", "success");
    await loadIntegration();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Telegram Integration</h1>
          <div className="flex gap-2">
            <Link href="/settings/integrations/logs" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Logs</Link>
            <Link href="/settings/integrations" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Back</Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-400">Loading...</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-4 text-sm text-slate-300">Connect your Telegram bot token to start receiving conversations in Inbox.</div>

              <label className="mb-1 block text-xs text-slate-400">Integration name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />

              <label className="mb-1 block text-xs text-slate-400">Bot token</label>
              <input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder={integration?.credentialsMasked || "123456:ABC..."} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />

              {integration ? (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
                  <div>Status: <span className="text-slate-100">{integration.status}</span></div>
                  <div className="text-slate-300">Saved token: {integration.credentialsMasked || "—"}</div>
                  <div className="text-slate-300">Webhook URL: {integration.config?.webhookUrl || "—"}</div>
                  <div className="text-slate-300">Bot username: {integration.config?.botUsername || "—"}</div>
                  <div className="text-slate-300">Last event: {integration.lastEventAt ? new Date(integration.lastEventAt).toLocaleString() : "No events yet"}</div>
                  <div className="text-slate-300">Last event status: {integration.lastEventStatus || "—"}</div>
                  <div className="text-slate-300">Last sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}</div>
                  {integration.lastErrorMessage ? <div className="mt-1 text-red-300">Last error: {integration.lastErrorMessage}</div> : null}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <button onClick={onConnect} disabled={isSaving} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">{isSaving ? "Saving..." : connectLabel}</button>
                {integration ? <button onClick={onDisconnect} disabled={isSaving} className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 disabled:opacity-60">Disconnect</button> : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              <h3 className="mb-2 font-semibold text-slate-200">Setup instructions</h3>
              <ol className="list-decimal space-y-1 pl-4 text-xs">
                <li>Open Telegram and message <strong className="text-slate-300">@BotFather</strong>.</li>
                <li>Create a bot with <strong className="text-slate-300">/newbot</strong> and copy the bot token.</li>
                <li>Paste the token above and click <strong className="text-slate-300">Connect</strong>.</li>
                <li>After saving, the system automatically sets webhook to your CRM endpoint.</li>
                <li>Send a message to your bot from any Telegram account to test inbound flow.</li>
                <li>Open <strong className="text-slate-300">Inbox</strong> and confirm conversation/message appear.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
