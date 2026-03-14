"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";
import { requestConfirm } from "@/lib/confirm";

type LeadDetail = {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  contact: { id: string; name: string; phone: string; email?: string | null };
  notes: { id: string; content: string; createdAt: string; author: { name: string } }[];
  tasks: { id: string; title: string; isCompleted: boolean; dueDate: string | null }[];
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

const statusText: Record<string, string> = {
  NEW: "Open",
  CONTACTED: "Contacted",
  BOOKED: "Booked",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  LOST: "Lost",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const [editingClient, setEditingClient] = useState(false);
  const [clientNameDraft, setClientNameDraft] = useState("");
  const [clientPhoneDraft, setClientPhoneDraft] = useState("");
  const [clientEmailDraft, setClientEmailDraft] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);

  const [editingLeadInfo, setEditingLeadInfo] = useState(false);
  const [leadTitleDraft, setLeadTitleDraft] = useState("");
  const [leadStatusDraft, setLeadStatusDraft] = useState("NEW");
  const [leadSourceDraft, setLeadSourceDraft] = useState("Other");
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [isSavingLeadInfo, setIsSavingLeadInfo] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskCompleted, setEditingTaskCompleted] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false);
  const [customDraft, setCustomDraft] = useState<Record<string, unknown>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  const statusBadgeClass = (status: string) => {
    if (status === "DONE") return "bg-emerald-950 text-emerald-300 border-emerald-800";
    if (status === "LOST") return "bg-red-950 text-red-300 border-red-800";
    if (status === "NEW") return "bg-sky-950 text-sky-300 border-sky-800";
    if (status === "IN_PROGRESS") return "bg-violet-950 text-violet-300 border-violet-800";
    if (status === "CONTACTED") return "bg-amber-950 text-amber-300 border-amber-800";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  const sourceBadgeClass = () => "bg-slate-900 text-slate-400 border-slate-700";

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        setError("Lead not found");
        return;
      }
      const data = await res.json();
      setLead(data.lead);
      setDescriptionDraft(data.lead.description || "");
      setClientNameDraft(data.lead.contact?.name || "");
      setClientPhoneDraft(data.lead.contact?.phone || "");
      setClientEmailDraft(data.lead.contact?.email || "");
      setLeadTitleDraft(data.lead.title || "");
      setLeadStatusDraft(data.lead.status || "NEW");
      setLeadSourceDraft(data.lead.source || "Other");
      setDueDateDraft(data.lead.dueDate ? data.lead.dueDate.slice(0, 10) : "");
      setCustomFields(data.customFields || []);
      const initialDraft: Record<string, unknown> = {};
      for (const field of data.customFields || []) {
        initialDraft[field.slug] = field.value ?? (field.fieldType === "BOOLEAN" ? false : "");
      }
      setCustomDraft(initialDraft);
    };
    load();
  }, [id]);

  const addNote = async () => {
    if (!noteText.trim() || !id || isAddingNote) return;
    setIsAddingNote(true);
    const res = await fetch(`/api/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText.trim() }),
    });
    setIsAddingNote(false);
    if (!res.ok) {
      showToast("Failed to add note", "error");
      return;
    }
    const data = await res.json();
    setLead((prev) => (prev ? { ...prev, notes: [data.note, ...prev.notes] } : prev));
    setNoteText("");
    showToast("Note added", "success");
  };

  const addTask = async () => {
    if (!taskTitle.trim() || !id || isAddingTask) return;
    setIsAddingTask(true);
    const res = await fetch(`/api/leads/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle.trim() }),
    });
    setIsAddingTask(false);
    if (!res.ok) {
      showToast("Failed to create task", "error");
      return;
    }
    const data = await res.json();
    setLead((prev) => (prev ? { ...prev, tasks: [data.task, ...prev.tasks] } : prev));
    setTaskTitle("");
    showToast("Task created", "success");
  };

  const deleteLead = async () => {
    if (!lead || isDeletingLead) return;
    const confirmed = await requestConfirm({
      title: "Delete lead",
      message: "Are you sure you want to delete this lead?",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    setIsDeletingLead(true);
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    setIsDeletingLead(false);
    if (!res.ok) {
      showToast("Failed to delete lead", "error");
      return;
    }
    showToast("Lead deleted", "success");
    router.push("/leads");
  };

  const saveDescription = async () => {
    if (!id || isSavingDescription) return;
    setIsSavingDescription(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: descriptionDraft.trim() || null }),
    });
    setIsSavingDescription(false);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update description", "error");
      return;
    }
    setLead((prev) => (prev ? { ...prev, description: data.lead.description } : prev));
    setEditingDescription(false);
    showToast("Lead updated", "success");
  };

  const saveClient = async () => {
    if (!lead?.contact?.id || !clientNameDraft.trim() || !clientPhoneDraft.trim() || isSavingClient) return;
    setIsSavingClient(true);
    const res = await fetch(`/api/contacts/${lead.contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientNameDraft.trim(), phone: clientPhoneDraft.trim(), email: clientEmailDraft.trim() || null }),
    });
    setIsSavingClient(false);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update client", "error");
      return;
    }
    setLead((prev) => (prev ? { ...prev, contact: { ...prev.contact, name: data.contact.name, phone: data.contact.phone, email: data.contact.email } } : prev));
    setEditingClient(false);
    showToast("Client updated", "success");
  };

  const saveLeadInfo = async () => {
    if (!id || !leadTitleDraft.trim() || isSavingLeadInfo) return;
    setIsSavingLeadInfo(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: leadTitleDraft.trim(), status: leadStatusDraft, source: leadSourceDraft || null, dueDate: dueDateDraft || null }),
    });
    setIsSavingLeadInfo(false);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update lead", "error");
      return;
    }
    if (data.lead) setLead((prev) => (prev ? { ...prev, title: data.lead.title, status: data.lead.status, source: data.lead.source, dueDate: data.lead.dueDate } : prev));
    setEditingLeadInfo(false);
    showToast("Lead updated", "success");
  };

  const saveNoteEdit = async () => {
    if (!editingNoteId || !editingNoteText.trim() || savingNoteId) return;
    setSavingNoteId(editingNoteId);
    const res = await fetch(`/api/notes/${editingNoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingNoteText.trim() }),
    });
    setSavingNoteId(null);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update note", "error");
      return;
    }
    setLead((prev) => prev ? { ...prev, notes: prev.notes.map((n) => n.id === editingNoteId ? { ...n, content: data.note.content } : n) } : prev);
    setEditingNoteId(null);
    setEditingNoteText("");
    showToast("Note updated", "success");
  };

  const deleteNote = async (noteId: string) => {
    if (deletingNoteId) return;
    const confirmed = await requestConfirm({
      title: "Delete note",
      message: "Delete this note?",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingNoteId(noteId);
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    setDeletingNoteId(null);
    if (!res.ok) {
      showToast("Failed to delete note", "error");
      return;
    }
    setLead((prev) => prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : prev);
    showToast("Note deleted", "success");
  };

  const saveTaskEdit = async () => {
    if (!editingTaskId || !editingTaskTitle.trim() || savingTaskId) return;
    setSavingTaskId(editingTaskId);
    const res = await fetch(`/api/tasks/${editingTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTaskTitle.trim(), isCompleted: editingTaskCompleted }),
    });
    setSavingTaskId(null);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update task", "error");
      return;
    }
    setLead((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === editingTaskId ? { ...t, title: data.task.title, isCompleted: data.task.isCompleted } : t) } : prev);
    setEditingTaskId(null);
    setEditingTaskTitle("");
    showToast("Task updated", "success");
  };

  const deleteTask = async (taskId: string) => {
    if (deletingTaskId) return;
    const confirmed = await requestConfirm({
      title: "Delete task",
      message: "Delete this task?",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingTaskId(taskId);
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setDeletingTaskId(null);
    if (!res.ok) {
      showToast("Failed to delete task", "error");
      return;
    }
    setLead((prev) => prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev);
    showToast("Task deleted", "success");
  };

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

      if (field.fieldType === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        nextErrors[field.slug] = "Invalid email";
      }
      if (field.fieldType === "PHONE" && !/^[+()\d\s-]{6,25}$/.test(String(value))) {
        nextErrors[field.slug] = "Invalid phone";
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

  const saveCustomFields = async () => {
    if (!id || isSavingCustomFields) return;
    if (!validateCustomFields()) return;
    setIsSavingCustomFields(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customFields: customDraft }),
    });
    setIsSavingCustomFields(false);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update custom fields", "error");
      return;
    }
    setCustomFields(data.customFields || []);
    setEditingCustomFields(false);
    showToast("Custom fields updated", "success");
  };

  const overdueLead = !!(lead?.dueDate && new Date(lead.dueDate) < new Date());

  if (error) return <div className="min-h-screen bg-slate-950 p-4 text-slate-100"><TopNav /><div className="m-4 text-red-300">{error}</div></div>;
  if (!lead) return <div className="min-h-screen bg-slate-950 p-4 text-slate-100"><TopNav /><div className="m-4">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{lead.title}</h1>
              <p className="mt-1 text-sm text-slate-400">Created {new Date(lead.createdAt).toLocaleDateString()} • {statusText[lead.status] || lead.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(lead.status)}`}>{statusText[lead.status] || lead.status}</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${sourceBadgeClass()}`}>{lead.source || "No source"}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditingLeadInfo(true)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700">Edit lead</button>
            <button onClick={deleteLead} disabled={isDeletingLead} className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950 disabled:opacity-60">{isDeletingLead ? "Deleting..." : "Delete"}</button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200">Description</h2>
            {!editingDescription ? <button onClick={() => setEditingDescription(true)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">Edit</button> : null}
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <textarea value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} className="min-h-[100px] w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
              <div className="flex gap-2">
                <button onClick={saveDescription} disabled={isSavingDescription} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{isSavingDescription ? "Saving..." : "Save"}</button>
                <button onClick={() => { setEditingDescription(false); setDescriptionDraft(lead.description || ""); }} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
              </div>
            </div>
          ) : <p className="mt-1 text-sm text-slate-300">{lead.description || "No description yet."}</p>}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-200">Client</div>
              {!editingClient ? <button onClick={() => setEditingClient(true)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">Edit</button> : null}
            </div>
            {editingClient ? (
              <div className="space-y-2">
                <input value={clientNameDraft} onChange={(e) => setClientNameDraft(e.target.value)} placeholder="Client name" className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                <input value={clientPhoneDraft} onChange={(e) => setClientPhoneDraft(e.target.value)} placeholder="Phone" className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                <input value={clientEmailDraft} onChange={(e) => setClientEmailDraft(e.target.value)} placeholder="Email" className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                <div className="flex gap-2">
                  <button onClick={saveClient} disabled={isSavingClient} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{isSavingClient ? "Saving..." : "Save"}</button>
                  <button onClick={() => { setEditingClient(false); setClientNameDraft(lead.contact.name); setClientPhoneDraft(lead.contact.phone); setClientEmailDraft(lead.contact.email || ""); }} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-2 font-medium text-slate-100">{lead.contact.name}</div>
                <div className="text-sm text-slate-300">{lead.contact.phone}</div>
                <div className="text-sm text-slate-400">{lead.contact.email || "No email"}</div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-200">Lead details</div>
              {!editingLeadInfo ? <button onClick={() => setEditingLeadInfo(true)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">Edit</button> : null}
            </div>
            {editingLeadInfo ? (
              <div className="space-y-2">
                <input value={leadTitleDraft} onChange={(e) => setLeadTitleDraft(e.target.value)} placeholder="Lead title" className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                <select value={leadStatusDraft} onChange={(e) => setLeadStatusDraft(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100">
                  <option value="NEW">NEW</option><option value="CONTACTED">CONTACTED</option><option value="BOOKED">BOOKED</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="DONE">DONE</option><option value="LOST">LOST</option>
                </select>
                <select value={leadSourceDraft} onChange={(e) => setLeadSourceDraft(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100">
                  <option value="WhatsApp">WhatsApp</option><option value="Telegram">Telegram</option><option value="Instagram">Instagram</option><option value="Phone">Phone</option><option value="Website">Website</option><option value="Other">Other</option>
                </select>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Due date</label>
                  <input type="date" value={dueDateDraft} onChange={(e) => setDueDateDraft(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveLeadInfo} disabled={isSavingLeadInfo} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{isSavingLeadInfo ? "Saving..." : "Save"}</button>
                  <button onClick={() => { setEditingLeadInfo(false); setLeadTitleDraft(lead.title); setLeadStatusDraft(lead.status); setLeadSourceDraft(lead.source || "Other"); setDueDateDraft(lead.dueDate ? lead.dueDate.slice(0, 10) : ""); }} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-slate-300">
                <div>Status: <span className="text-slate-100">{statusText[lead.status] || lead.status}</span></div>
                <div>Source: <span className="text-slate-100">{lead.source || "—"}</span></div>
                <div>Due date: <span className={overdueLead ? "text-red-400" : "text-slate-100"}>{lead.dueDate ? new Date(lead.dueDate).toLocaleDateString() : "—"}</span></div>
              </div>
            )}
          </div>
        </div>

        <section className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Custom fields</h2>
            {customFields.length > 0 && !editingCustomFields ? (
              <button onClick={() => setEditingCustomFields(true)} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-300">Edit</button>
            ) : null}
          </div>

          {customFields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">No custom fields configured for leads.</div>
          ) : editingCustomFields ? (
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id}>
                  <label className="mb-1 block text-xs text-slate-300">{field.name}{field.isRequired ? " *" : ""}</label>
                  {field.fieldType === "TEXTAREA" ? (
                    <textarea rows={3} value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                  ) : field.fieldType === "SELECT" ? (
                    <select value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                      <option value="">Select option</option>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.fieldType === "BOOLEAN" ? (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(customDraft[field.slug])} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.checked }))} /> Yes</label>
                  ) : (
                    <input type={field.fieldType === "NUMBER" ? "number" : field.fieldType === "DATE" ? "date" : "text"} value={String(customDraft[field.slug] ?? "")} onChange={(e) => setCustomDraft((prev) => ({ ...prev, [field.slug]: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" placeholder={field.placeholder || undefined} />
                  )}
                  {field.helpText ? <div className="mt-1 text-[11px] text-slate-500">{field.helpText}</div> : null}
                  {customErrors[field.slug] ? <div className="mt-1 text-xs text-red-300">{customErrors[field.slug]}</div> : null}
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={saveCustomFields} disabled={isSavingCustomFields} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{isSavingCustomFields ? "Saving..." : "Save"}</button>
                <button onClick={() => setEditingCustomFields(false)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.filter((field) => field.value !== null && field.value !== "").length === 0 ? (
                <div className="text-sm text-slate-400">No values yet.</div>
              ) : (
                customFields
                  .filter((field) => field.value !== null && field.value !== "")
                  .map((field) => (
                    <div key={field.id} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                      <span className="text-slate-400">{field.name}: </span>
                      <span className="text-slate-100">{field.fieldType === "BOOLEAN" ? (field.value ? "Yes" : "No") : String(field.value)}</span>
                    </div>
                  ))
              )}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <div className="mt-3 flex items-start gap-2">
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note" className="min-h-[96px] flex-1 rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" />
            <button onClick={addNote} disabled={!noteText.trim() || isAddingNote} className="h-[96px] rounded-md bg-blue-600 px-3 text-white disabled:opacity-60">{isAddingNote ? "Adding..." : "Add note"}</button>
          </div>
          {lead.notes.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-5 text-center">
              <h3 className="font-medium">No notes yet</h3>
              <p className="mt-1 text-sm text-slate-400">Add a note to keep context for this lead.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" rows={3} />
                      <div className="flex gap-2">
                        <button onClick={saveNoteEdit} disabled={savingNoteId === note.id} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{savingNoteId === note.id ? "Saving..." : "Save"}</button>
                        <button onClick={() => setEditingNoteId(null)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-slate-200">{note.content}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>{note.author.name} • {new Date(note.createdAt).toLocaleString()}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.content); }} className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">Edit</button>
                          <button onClick={() => deleteNote(note.id)} disabled={deletingNoteId === note.id} className="rounded border border-red-900 px-2 py-0.5 text-red-300 disabled:opacity-60">{deletingNoteId === note.id ? "..." : "Delete"}</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <div className="mt-3 flex items-center gap-2">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task" className="h-11 flex-1 rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100 placeholder:text-slate-400" />
            <button onClick={addTask} disabled={!taskTitle.trim() || isAddingTask} className="h-11 rounded-md bg-blue-600 px-3 text-white disabled:opacity-60">{isAddingTask ? "Creating..." : "Create task"}</button>
          </div>
          {lead.tasks.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-5 text-center">
              <h3 className="font-medium">No tasks yet</h3>
              <p className="mt-1 text-sm text-slate-400">Create your first task to follow up this lead.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {lead.tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  {editingTaskId === task.id ? (
                    <div className="space-y-2">
                      <input value={editingTaskTitle} onChange={(e) => setEditingTaskTitle(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 p-2 text-slate-100" />
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editingTaskCompleted} onChange={(e) => setEditingTaskCompleted(e.target.checked)} /> Mark as completed</label>
                      <div className="flex gap-2">
                        <button onClick={saveTaskEdit} disabled={savingTaskId === task.id} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">{savingTaskId === task.id ? "Saving..." : "Save"}</button>
                        <button onClick={() => setEditingTaskId(null)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={task.isCompleted ? "text-sm text-slate-300 line-through" : "text-sm text-slate-100"}>{task.title}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>{task.isCompleted ? "Completed" : "Open"}{task.dueDate ? ` • ${new Date(task.dueDate).toLocaleDateString()}` : ""}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); setEditingTaskCompleted(task.isCompleted); }} className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-slate-300">Edit</button>
                          <button onClick={() => deleteTask(task.id)} disabled={deletingTaskId === task.id} className="rounded border border-red-900 px-2 py-0.5 text-red-300 disabled:opacity-60">{deletingTaskId === task.id ? "..." : "Delete"}</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
