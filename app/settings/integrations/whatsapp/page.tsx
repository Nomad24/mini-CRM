"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Integration = {
  id: string;
  provider: "WHATSAPP";
  name: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  credentialsMasked?: string | null;
  config?: {
    webhookUrl?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    verifyToken?: string;
  };
  lastSyncAt?: string | null;
  lastEventAt?: string | null;
  lastEventStatus?: string | null;
  lastErrorMessage?: string | null;
};

export default function WhatsAppIntegrationPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("Main WhatsApp");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [appSecret, setAppSecret] = useState("");

  async function loadIntegration() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      const wa = (data.integrations || []).find((i: Integration) => i.provider === "WHATSAPP") || null;
      setIntegration(wa);
      if (wa?.name) setName(wa.name);
      if (wa?.config?.phoneNumberId) setPhoneNumberId(wa.config.phoneNumberId);
      if (wa?.config?.businessAccountId) setBusinessAccountId(wa.config.businessAccountId);
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => { void loadIntegration(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectLabel = useMemo(() => (integration ? "Reconnect" : "Connect"), [integration]);

  const onConnect = async () => {
    if (!accessToken.trim()) { showToast("Access token is required", "error"); return; }
    if (!phoneNumberId.trim()) { showToast("Phone number ID is required", "error"); return; }
    if (!verifyToken.trim()) { showToast("Verify token is required", "error"); return; }

    setIsSaving(true);
    const res = await fetch("/api/integrations/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Main WhatsApp",
        accessToken: accessToken.trim(),
        phoneNumberId: phoneNumberId.trim(),
        verifyToken: verifyToken.trim(),
        businessAccountId: businessAccountId.trim() || undefined,
        appSecret: appSecret.trim() || undefined,
      }),
    });
    setIsSaving(false);

    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Failed to connect WhatsApp", "error"); return; }

    showToast("WhatsApp integration saved", "success");
    setAccessToken("");
    setAppSecret("");
    await loadIntegration();
  };

  const onDisconnect = async () => {
    if (!integration) return;
    setIsSaving(true);
    const res = await fetch(`/api/integrations/${integration.id}/disconnect`, { method: "POST" });
    setIsSaving(false);
    if (!res.ok) { showToast("Failed to disconnect", "error"); return; }
    showToast("Integration disconnected", "success");
    await loadIntegration();
  };

  const badgeClass = (status?: string | null) =>
    status === "CONNECTED"
      ? "rounded-full border border-emerald-900 bg-emerald-950 px-2 py-0.5 text-xs text-emerald-300"
      : status === "ERROR"
        ? "rounded-full border border-red-900 bg-red-950 px-2 py-0.5 text-xs text-red-300"
        : "rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">WhatsApp Integration</h1>
          <div className="flex gap-2">
            <Link href="/settings/integrations/logs" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Logs</Link>
            <Link href="/settings/integrations" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Back</Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-400">Loading...</div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Status card */}
            {integration && (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{integration.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {integration.credentialsMasked ? `Token: ${integration.credentialsMasked}` : "Token saved"}
                      {integration.config?.phoneNumberId ? ` · Phone ID: ${integration.config.phoneNumberId}` : ""}
                    </div>
                    {integration.config?.webhookUrl && (
                      <div className="mt-1 text-xs text-slate-500">
                        Webhook: <span className="font-mono text-slate-300">{integration.config.webhookUrl}</span>
                      </div>
                    )}
                    {integration.lastEventAt && (
                      <div className="mt-1 text-xs text-slate-500">
                        Last event: {new Date(integration.lastEventAt).toLocaleString()} · {integration.lastEventStatus}
                      </div>
                    )}
                    {integration.lastErrorMessage && (
                      <div className="mt-1 text-xs text-red-300">Last error: {integration.lastErrorMessage}</div>
                    )}
                  </div>
                  <span className={badgeClass(integration.status)}>{integration.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={onDisconnect} disabled={isSaving} className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-60">
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {/* Connect/reconnect form */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-3 text-lg font-semibold">{connectLabel}</h2>
              <p className="mb-4 text-sm text-slate-400">
                Connect your WhatsApp Business account. You&apos;ll need a Meta Developer App with WhatsApp Cloud API access.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Integration name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Access token <span className="text-red-400">*</span></label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAxxxx..."
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Phone number ID <span className="text-red-400">*</span></label>
                  <input
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="123456789"
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Verify token <span className="text-red-400">*</span></label>
                  <input
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    placeholder="my-secret-verify-token"
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">Used to verify your webhook in Meta Developer Console.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Business account ID (optional)</label>
                  <input
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">App secret (optional — for webhook signature verification)</label>
                  <input
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <button onClick={onConnect} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60">
                  {isSaving ? "Saving..." : connectLabel}
                </button>
              </div>
            </div>

            {/* Setup instructions */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              <h3 className="mb-2 font-semibold text-slate-200">Setup instructions</h3>
              <ol className="list-decimal space-y-1 pl-4 text-xs">
                <li>Go to <strong className="text-slate-300">Meta for Developers</strong> → Your App → WhatsApp → API Setup.</li>
                <li>Copy the <strong className="text-slate-300">Temporary or Permanent Access Token</strong>.</li>
                <li>Copy the <strong className="text-slate-300">Phone Number ID</strong> from the same page.</li>
                <li>Enter a <strong className="text-slate-300">Verify Token</strong> — any secret string you choose.</li>
                <li>Click <strong className="text-slate-300">Connect</strong> to save and get your webhook URL.</li>
                <li>In Meta Developer Console → Webhooks, set the webhook URL and the same verify token.</li>
                <li>Subscribe to the <strong className="text-slate-300">messages</strong> field.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
