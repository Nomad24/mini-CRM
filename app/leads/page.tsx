"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";
import { requestConfirm } from "@/lib/confirm";

type Lead = {
  id: string;
  title: string;
  status: string;
  source: string | null;
  createdAt: string;
  contact: { name: string; phone: string };
};

const statusBadgeClass = (status: string) => {
  if (status === "NEW") return "bg-sky-950 text-sky-300 border-sky-800";
  if (status === "CONTACTED") return "bg-amber-950 text-amber-300 border-amber-800";
  if (status === "IN_PROGRESS") return "bg-violet-950 text-violet-300 border-violet-800";
  if (status === "DONE") return "bg-emerald-950 text-emerald-300 border-emerald-800";
  if (status === "LOST") return "bg-red-950 text-red-300 border-red-800";
  return "bg-slate-800 text-slate-300 border-slate-700";
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");

  const createdNotice = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("created") === "1"
    ? "Lead created successfully."
    : "";

  const loadLeads = useCallback(async () => {
    setIsFiltering(true);
    setError("");
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (status !== "ALL") query.set("status", status);
    if (source !== "ALL") query.set("source", source);

    const res = await fetch(`/api/leads${query.toString() ? `?${query.toString()}` : ""}`);
    if (!res.ok) {
      setIsFiltering(false);
      setError("Unauthorized. Please login.");
      showToast("Failed to load leads", "error");
      return;
    }

    const data = await res.json();
    setLeads(data.leads || []);
    setIsFiltering(false);
  }, [search, status, source]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadLeads]);

  const availableSources = useMemo(() => {
    const values = new Set<string>();
    for (const lead of leads) {
      if (lead.source) values.add(lead.source);
    }
    return ["ALL", ...Array.from(values)];
  }, [leads]);

  const onDelete = async (id: string) => {
    const confirmed = await requestConfirm({
      title: "Delete lead",
      message: "Are you sure you want to delete this lead?",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingId(id);
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      setError("Failed to delete lead.");
      showToast("Failed to delete lead", "error");
      return;
    }

    setLeads((prev) => prev.filter((l) => l.id !== id));
    setNotice("Lead deleted successfully.");
    showToast("Lead deleted", "success");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <Link className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500" href="/leads/new">New lead</Link>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title / client / phone"
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-400"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">
            <option value="ALL">All statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="BOOKED">BOOKED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="LOST">LOST</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">
            {availableSources.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All sources" : s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setSource("ALL");
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700 md:col-span-3 md:justify-self-start"
          >
            Reset filters
          </button>
        </div>

        {(notice || createdNotice) && <div className="mt-3 rounded border border-emerald-800 bg-emerald-950 p-2 text-emerald-300">{notice || createdNotice}</div>}
        {isFiltering && <div className="mt-2 text-xs text-slate-400">Updating list...</div>}
        {error && <div className="mt-3 rounded border border-red-800 bg-red-950 p-2 text-red-300">{error}</div>}

        {leads.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
            <h2 className="text-lg font-medium">No leads yet</h2>
            <p className="mt-1 text-sm text-slate-400">Create your first lead to start tracking customers.</p>
            <Link className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white" href="/leads/new">Create lead</Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-2 font-medium">Lead</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Source</th>
                  <th className="p-2 font-medium">Created</th>
                  <th className="p-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer border-b border-slate-800 transition hover:bg-slate-800/60">
                    <td className="p-2">
                      <div className="font-semibold text-slate-100">{lead.title}</div>
                      <div className="text-xs text-slate-400">{lead.contact?.name} • {lead.contact?.phone}</div>
                    </td>
                    <td className="p-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(lead.status)}`}>{lead.status}</span></td>
                    <td className="p-2 text-slate-300">{lead.source || "—"}</td>
                    <td className="p-2 text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700">Open</Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(lead.id);
                          }}
                          disabled={deletingId === lead.id}
                          className="rounded border border-red-900 px-1.5 py-0.5 text-[11px] text-red-300 hover:bg-red-950 disabled:opacity-60"
                        >
                          {deletingId === lead.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
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
