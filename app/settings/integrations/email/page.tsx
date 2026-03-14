"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Integration = {
  id: string;
  provider: "EMAIL";
  name: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  credentialsMasked?: string | null;
  config?: {
    webhookUrl?: string;
    sourceType?: string;
    inboxAddress?: string;
  };
  lastSyncAt?: string | null;
  lastEventAt?: string | null;
  lastEventStatus?: string | null;
  lastErrorMessage?: string | null;
};

export default function EmailIntegrationPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("Main Email");
  const [sourceType, setSourceType] = useState<"forwarding" | "gmail" | "outlook">("forwarding");
  const [inboxAddress, setInboxAddress] = useState("");

  async function loadIntegration() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      const email = (data.integrations || []).find((i: Integration) => i.provider === "EMAIL") || null;
      setIntegration(email);
      if (email?.name) setName(email.name);
      if (email?.config?.sourceType) setSourceType(email.config.sourceType as "forwarding" | "gmail" | "outlook");
      if (email?.config?.inboxAddress) setInboxAddress(email.config.inboxAddress);
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => { void loadIntegration(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectLabel = useMemo(() => (integration ? "Reconnect" : "Connect"), [integration]);

  const onConnect = async () => {
    setIsSaving(true);
    const res = await fetch("/api/integrations/email/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Main Email",
        sourceType,
        inboxAddress: inboxAddress.trim() || undefined,
      }),
    });
    setIsSaving(false);

    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Failed to connect Email", "error"); return; }

    showToast("Email integration saved", "success");
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

  const sourceLabel = (t: string) => t === "gmail" ? "Gmail" : t === "outlook" ? "Outlook" : "Forwarding inbox";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Email Integration</h1>
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
                      {sourceLabel(integration.config?.sourceType || "forwarding")}
                      {integration.config?.inboxAddress ? ` · ${integration.config.inboxAddress}` : ""}
                    </div>
                    {integration.config?.webhookUrl && (
                      <div className="mt-1 text-xs text-slate-500">
                        Ingestion endpoint:{" "}
                        <span className="font-mono text-slate-300">{integration.config.webhookUrl}</span>
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

            {/* Connect form */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-3 text-lg font-semibold">{connectLabel}</h2>
              <p className="mb-4 text-sm text-slate-400">
                Receive inbound emails in your CRM inbox. Choose your email source type.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Integration name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Email source type</label>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value as "forwarding" | "gmail" | "outlook")} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                    <option value="forwarding">Forwarding inbox (webhook POST)</option>
                    <option value="gmail">Gmail (coming soon)</option>
                    <option value="outlook">Outlook (coming soon)</option>
                  </select>
                </div>
                {sourceType === "forwarding" && (
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Inbox address (optional)</label>
                    <input
                      value={inboxAddress}
                      onChange={(e) => setInboxAddress(e.target.value)}
                      placeholder="support@yourcompany.com"
                      className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">The address emails are forwarded from. For display only.</p>
                  </div>
                )}
                <button onClick={onConnect} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60">
                  {isSaving ? "Saving..." : connectLabel}
                </button>
              </div>
            </div>

            {/* Setup instructions */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              <h3 className="mb-2 font-semibold text-slate-200">Forwarding inbox — setup instructions</h3>
              <ol className="list-decimal space-y-1 pl-4 text-xs">
                <li>Click <strong className="text-slate-300">Connect</strong> to get your ingestion endpoint URL.</li>
                <li>Configure your email server or service to <strong className="text-slate-300">POST</strong> inbound emails to that URL.</li>
                <li>The expected JSON body:
                  <pre className="mt-1 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">{`{
  "messageId": "unique-message-id",
  "threadId": "thread-id",       // optional, for grouping
  "from": { "name": "Alice", "email": "alice@example.com" },
  "subject": "Hello",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",    // optional
  "sentAt": "2026-03-14T10:00:00Z"
}`}</pre>
                </li>
                <li>You can use tools like <strong className="text-slate-300">Cloudmailin</strong>, <strong>Postmark Inbound</strong>, or a custom SMTP → webhook bridge.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
