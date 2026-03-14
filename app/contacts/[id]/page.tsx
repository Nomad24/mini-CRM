"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Contact = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
  leads: { id: string; title: string; status: string; source: string | null; createdAt: string; updatedAt: string }[];
};

type CustomFieldEntry = {
  id: string;
  name: string;
  slug: string;
  fieldType: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "PHONE" | "EMAIL";
  isRequired: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options: string[];
  value: unknown;
};

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [lastActivity, setLastActivity] = useState<string>("");
  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);
  const [customDraft, setCustomDraft] = useState<Record<string, unknown>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setContact(data.contact);
      setLastActivity(data.lastActivity ?? "");
      setCustomFields(data.customFields || []);
      setNameDraft(data.contact?.name || "");
      setPhoneDraft(data.contact?.phone || "");
      setEmailDraft(data.contact?.email || "");

      const draft: Record<string, unknown> = {};
      for (const field of data.customFields || []) {
        draft[field.slug] = field.value ?? (field.fieldType === "BOOLEAN" ? false : "");
      }
      setCustomDraft(draft);
    }
    load();
  }, [id]);

  const validateCustomFields = () => {
    const nextErrors: Record<string, string> = {};

    for (const field of customFields) {
      const value = customDraft[field.slug];
      const isEmpty = value === null || value === undefined || (typeof value === "string" && value.trim() === "");
      if (field.isRequired && isEmpty) {
        nextErrors[field.slug] = "Required field";
        continue;
      }
      if (isEmpty) continue;
      if (field.fieldType === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) nextErrors[field.slug] = "Invalid email";
      if (field.fieldType === "PHONE" && !/^[+()\d\s-]{6,25}$/.test(String(value))) nextErrors[field.slug] = "Invalid phone";
      if (field.fieldType === "NUMBER" && Number.isNaN(Number(value))) nextErrors[field.slug] = "Invalid number";
      if (field.fieldType === "SELECT" && !field.options.includes(String(value))) nextErrors[field.slug] = "Invalid option";
    }

    setCustomErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSave = async () => {
    if (!contact || isSaving) return;
    if (!nameDraft.trim() || !phoneDraft.trim()) {
      showToast("Name and phone are required", "error");
      return;
    }
    if (!validateCustomFields()) return;

    setIsSaving(true);
    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameDraft.trim(),
        phone: phoneDraft.trim(),
        email: emailDraft.trim() || null,
        customFields: customDraft,
      }),
    });
    setIsSaving(false);

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update contact", "error");
      return;
    }

    setContact((prev) => prev ? { ...prev, ...data.contact } : prev);
    setCustomFields(data.customFields || []);
    setEditing(false);
    showToast("Contact updated", "success");
  };

  if (!contact) return <div className="min-h-screen bg-slate-950 text-slate-100"> <TopNav /> <div className="p-4">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{contact.name}</h1>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onSave} disabled={isSaving} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditing(false)} disabled={isSaving} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">Cancel</button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs text-slate-400">Phone</div>
            {editing ? <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100" /> : <div className="mt-1 font-medium">{contact.phone}</div>}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs text-slate-400">Email</div>
            {editing ? <input value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100" /> : <div className="mt-1 font-medium">{contact.email || "No email"}</div>}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs text-slate-400">Last activity</div>
            <div className="mt-1 font-medium">{lastActivity ? new Date(lastActivity).toLocaleDateString() : "No activity yet"}</div>
          </div>
        </div>

        {editing ? (
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <label className="mb-1 block text-xs text-slate-400">Name</label>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100" />
          </div>
        ) : null}

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Custom fields</h2>
          {customFields.length === 0 ? (
            <div className="mt-3 text-sm text-slate-400">No custom fields configured for contacts.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {customFields.map((field) => (
                <div key={field.id}>
                  <label className="mb-1 block text-xs text-slate-300">{field.name}{field.isRequired ? " *" : ""}</label>
                  {editing ? (
                    field.fieldType === "TEXTAREA" ? (
                      <textarea rows={3} value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100" />
                    ) : field.fieldType === "SELECT" ? (
                      <select value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100">
                        <option value="">Select option</option>
                        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.fieldType === "BOOLEAN" ? (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(customDraft[field.slug])} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.checked }))} /> Yes</label>
                    ) : (
                      <input type={field.fieldType === "NUMBER" ? "number" : field.fieldType === "DATE" ? "date" : "text"} value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100" placeholder={field.placeholder || undefined} />
                    )
                  ) : (
                    <div className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                      {field.value === null || field.value === "" ? <span className="text-slate-500">—</span> : field.fieldType === "BOOLEAN" ? (field.value ? "Yes" : "No") : String(field.value)}
                    </div>
                  )}
                  {field.helpText ? <div className="mt-1 text-[11px] text-slate-500">{field.helpText}</div> : null}
                  {customErrors[field.slug] ? <div className="mt-1 text-xs text-red-300">{customErrors[field.slug]}</div> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
          Created: <span className="text-slate-100">{new Date(contact.createdAt).toLocaleDateString()}</span> • Leads: <span className="text-slate-100">{contact.leads.length}</span>
        </div>

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Related leads</h2>
          {contact.leads.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-5 text-center">
              <h3 className="font-medium">No leads yet</h3>
              <p className="mt-1 text-sm text-slate-400">Create a lead to connect activity to this contact.</p>
              <Link href="/leads/new" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">Create lead</Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {contact.leads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded-lg border border-slate-700 bg-slate-950 p-3 hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-100">{lead.title}</div>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{lead.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Source: {lead.source || "—"} • Updated: {new Date(lead.updatedAt).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
