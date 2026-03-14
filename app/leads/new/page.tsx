"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "PHONE" | "EMAIL";
type CustomField = {
  id: string;
  name: string;
  slug: string;
  fieldType: FieldType;
  isRequired: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options: string[];
};

export default function LeadNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("WhatsApp");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCustomFields() {
      const res = await fetch("/api/custom-fields?entityType=LEAD&activeOnly=1");
      if (!res.ok) return;
      const data = await res.json();
      setCustomFields(data.fields || []);
    }
    loadCustomFields();
  }, []);

  const validateCustomFields = () => {
    const nextErrors: Record<string, string> = {};

    for (const field of customFields) {
      const value = customValues[field.slug];
      const isEmpty = value === null || value === undefined || (typeof value === "string" && value.trim() === "");

      if (field.isRequired && isEmpty) {
        nextErrors[field.slug] = "Required field";
        continue;
      }

      if (isEmpty) continue;

      if (field.fieldType === "EMAIL") {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
        if (!valid) nextErrors[field.slug] = "Invalid email";
      }

      if (field.fieldType === "PHONE") {
        const valid = /^[+()\d\s-]{6,25}$/.test(String(value));
        if (!valid) nextErrors[field.slug] = "Invalid phone";
      }

      if (field.fieldType === "NUMBER" && Number.isNaN(Number(value))) {
        nextErrors[field.slug] = "Invalid number";
      }

      if (field.fieldType === "SELECT" && !field.options.includes(String(value))) {
        nextErrors[field.slug] = "Invalid option";
      }
    }

    setCustomErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateCustomFields()) return;

    setIsSubmitting(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, contactName, phone, source, description, dueDate: dueDate || null, customFields: customValues }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed");
      showToast(data.error || "Failed to create lead", "error");
      return;
    }

    showToast("Lead created", "success");
    router.push("/leads?created=1");
  };

  const renderCustomField = (field: CustomField) => {
    const value = customValues[field.slug];
    const baseClass = "w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400";

    if (field.fieldType === "TEXTAREA") {
      return <textarea className={baseClass} rows={3} placeholder={field.placeholder || undefined} value={String(value ?? "")} onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.slug]: e.target.value }))} />;
    }

    if (field.fieldType === "SELECT") {
      return (
        <select className={baseClass} value={String(value ?? "")} onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.slug]: e.target.value }))}>
          <option value="">Select option</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    if (field.fieldType === "BOOLEAN") {
      return (
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.slug]: e.target.checked }))} />
          Yes
        </label>
      );
    }

    const inputType = field.fieldType === "NUMBER" ? "number" : field.fieldType === "DATE" ? "date" : "text";
    return <input type={inputType} className={baseClass} placeholder={field.placeholder || undefined} value={String(value ?? "")} onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.slug]: e.target.value }))} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold">Create Lead</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded border border-slate-700 bg-slate-900 p-4">
          <input className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" placeholder="Client name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          <input className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <label className="mb-1 block text-xs text-slate-400">Due date (deadline)</label>
            <input type="date" className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <select className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100" value={source} onChange={(e) => setSource(e.target.value)}>
            <option>WhatsApp</option><option>Telegram</option><option>Instagram</option><option>Phone</option><option>Website</option><option>Other</option>
          </select>

          {customFields.length > 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <h2 className="text-sm font-semibold text-slate-200">Custom fields</h2>
              <div className="mt-3 space-y-3">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="mb-1 block text-xs text-slate-300">{field.name}{field.isRequired ? " *" : ""}</label>
                    {renderCustomField(field)}
                    {field.helpText ? <div className="mt-1 text-[11px] text-slate-500">{field.helpText}</div> : null}
                    {customErrors[field.slug] ? <div className="mt-1 text-xs text-red-300">{customErrors[field.slug]}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error && <div className="text-red-300">{error}</div>}
          <button disabled={isSubmitting} className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Create"}</button>
        </form>
      </main>
    </div>
  );
}
