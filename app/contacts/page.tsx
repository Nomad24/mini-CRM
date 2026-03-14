"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNav } from "@/app/components/TopNav";

type Contact = { id: string; name: string; phone: string; email?: string | null; createdAt: string; leads: { id: string }[] };

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/contacts");
      if (!res.ok) {
        setError("Unauthorized");
        return;
      }
      const data = await res.json();
      setContacts(data.contacts || []);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Contacts</h1>
        {error && <div className="mt-2 rounded border border-red-800 bg-red-950 p-2 text-red-300">{error}</div>}
        {contacts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
            <h2 className="text-lg font-medium">No contacts yet</h2>
            <p className="mt-1 text-sm text-slate-400">Contacts will appear automatically when you create leads.</p>
            <Link href="/leads/new" className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">Create first lead</Link>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-2 font-medium">Name</th><th className="p-2 font-medium">Phone</th><th className="p-2 font-medium">Email</th><th className="p-2 font-medium">Created</th><th className="p-2 font-medium">Leads</th></tr></thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/contacts/${c.id}`)} className="cursor-pointer border-b border-slate-800 transition hover:bg-slate-800/60">
                    <td className="p-2 font-semibold text-slate-100">{c.name}</td>
                    <td className="p-2 text-slate-400">{c.phone}</td>
                    <td className="p-2 text-slate-400">{c.email || "—"}</td>
                    <td className="p-2 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 text-slate-300">{c.leads.length}</td>
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
