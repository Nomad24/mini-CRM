"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { TopNav } from "@/app/components/TopNav";

type LogItem = {
  id: string;
  provider: string;
  eventType: string;
  processingStatus: string;
  errorMessage?: string | null;
  createdAt: string;
  processedAt?: string | null;
  integration?: { id: string; name: string; provider: string; status: string } | null;
};

export default function IntegrationLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      const params = new URLSearchParams();
      if (providerFilter !== "all") params.set("provider", providerFilter);
      if (statusFilter !== "all") params.set("processingStatus", statusFilter);
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      const res = await fetch(`/api/integration-logs?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
      setLoading(false);
    }
    loadLogs();
  }, [providerFilter, statusFilter, deferredSearch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Integration Logs</h1>
          <Link href="/settings/integrations" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Back</Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 md:grid-cols-3">
          <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="all">All providers</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="FORM">Form</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
            <option value="ignored">Ignored</option>
            <option value="failed">Failed</option>
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by event, integration, error" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-400">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-sm text-slate-400">No integration events yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Integration</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 align-top">
                    <td className="p-3 text-slate-300">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="text-slate-100">{log.integration?.name || "Unknown integration"}</div>
                      <div className="text-xs text-slate-500">{log.provider}</div>
                    </td>
                    <td className="p-3 text-slate-300">{log.eventType}</td>
                    <td className="p-3">
                      <span className={log.processingStatus === "processed" ? "rounded-full border border-emerald-900 bg-emerald-950 px-2 py-0.5 text-xs text-emerald-300" : log.processingStatus === "failed" ? "rounded-full border border-red-900 bg-red-950 px-2 py-0.5 text-xs text-red-300" : log.processingStatus === "ignored" ? "rounded-full border border-amber-900 bg-amber-950 px-2 py-0.5 text-xs text-amber-300" : "rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300"}>{log.processingStatus}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">{log.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
