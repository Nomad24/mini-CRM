"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";

type Integration = {
  id: string;
  provider: "TELEGRAM" | "WHATSAPP" | "EMAIL" | "WEBHOOK" | "FORM";
  name: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  credentialsMasked?: string | null;
  lastErrorMessage?: string | null;
  config?: { sourceType?: string; inboxAddress?: string; phoneNumberId?: string };
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const telegram = useMemo(() => integrations.find((item) => item.provider === "TELEGRAM") || null, [integrations]);
  const whatsapp = useMemo(() => integrations.find((item) => item.provider === "WHATSAPP") || null, [integrations]);
  const email = useMemo(() => integrations.find((item) => item.provider === "EMAIL") || null, [integrations]);

  const badgeClass = (status?: Integration["status"] | null) => status === "CONNECTED"
    ? "rounded-full border border-emerald-900 bg-emerald-950 px-2 py-0.5 text-xs text-emerald-300"
    : status === "ERROR"
      ? "rounded-full border border-red-900 bg-red-950 px-2 py-0.5 text-xs text-red-300"
      : "rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
          <div className="flex gap-2">
            <Link href="/settings/integrations/logs" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">View logs</Link>
            <Link href="/settings" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Back to settings</Link>
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-400">Loading integrations...</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Telegram</h2>
                <p className="text-sm text-slate-400">Connect Telegram Bot API to receive inbound chats in Inbox.</p>
              </div>
              <span className={badgeClass(telegram?.status)}>{telegram?.status || "DISCONNECTED"}</span>
            </div>
            <div className="mt-3 text-xs text-slate-500">{telegram?.credentialsMasked ? `Token: ${telegram.credentialsMasked}` : "Token not connected"}</div>
            {telegram?.lastErrorMessage ? <div className="mt-2 text-xs text-red-300">Last error: {telegram.lastErrorMessage}</div> : null}
            <Link href="/settings/integrations/telegram" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm text-white">{telegram ? "Configure" : "Connect"}</Link>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">WhatsApp</h2>
                <p className="text-sm text-slate-400">Connect WhatsApp Business Cloud API to receive inbound messages.</p>
              </div>
              <span className={badgeClass(whatsapp?.status)}>{whatsapp?.status || "DISCONNECTED"}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {whatsapp?.credentialsMasked ? `Token: ${whatsapp.credentialsMasked}` : "Not connected"}
              {whatsapp?.config?.phoneNumberId ? ` · Phone ID: ${whatsapp.config.phoneNumberId}` : ""}
            </div>
            {whatsapp?.lastErrorMessage ? <div className="mt-1 text-xs text-red-300">Last error: {whatsapp.lastErrorMessage}</div> : null}
            <Link href="/settings/integrations/whatsapp" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm text-white">{whatsapp ? "Configure" : "Connect"}</Link>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Email</h2>
                <p className="text-sm text-slate-400">Receive inbound emails in your CRM inbox via forwarding or provider integration.</p>
              </div>
              <span className={badgeClass(email?.status)}>{email?.status || "DISCONNECTED"}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {email?.config?.sourceType
                ? `${email.config.sourceType === "gmail" ? "Gmail" : email.config.sourceType === "outlook" ? "Outlook" : "Forwarding"}${email.config.inboxAddress ? ` · ${email.config.inboxAddress}` : ""}`
                : "Not connected"}
            </div>
            {email?.lastErrorMessage ? <div className="mt-1 text-xs text-red-300">Last error: {email.lastErrorMessage}</div> : null}
            <Link href="/settings/integrations/email" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm text-white">{email ? "Configure" : "Connect"}</Link>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 opacity-70">
            <h2 className="text-lg font-semibold">Webhooks</h2>
            <p className="text-sm text-slate-400">Coming soon.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
