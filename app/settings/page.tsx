"use client";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";
import { requestConfirm } from "@/lib/confirm";
import Link from "next/link";

type WorkspaceInfo = { id: string; name: string; createdAt: string };
type UserInfo = { id: string; name: string; email: string; role?: string };
type FieldEntity = "LEAD" | "CONTACT";
type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN" | "PHONE" | "EMAIL";

type CustomField = {
  id: string;
  entityType: FieldEntity;
  name: string;
  slug: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  placeholder?: string | null;
  helpText?: string | null;
  options: string[];
};

type FieldForm = {
  id?: string;
  entityType: FieldEntity;
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  placeholder: string;
  helpText: string;
  optionsText: string;
};

const defaultForm = (entityType: FieldEntity): FieldForm => ({
  entityType,
  name: "",
  fieldType: "TEXT",
  isRequired: false,
  isActive: true,
  sortOrder: 0,
  placeholder: "",
  helpText: "",
  optionsText: "",
});

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [users, setUsers] = useState<UserInfo[]>([]);

  const [tab, setTab] = useState<FieldEntity>("LEAD");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldForm>(defaultForm("LEAD"));

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const data = await meRes.json();
        setWorkspace(data.workspace ?? null);
        setWorkspaceName(data.workspace?.name ?? "");
        setUsersCount(data.usersCount ?? 0);
      }

      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    }
    load();
  }, []);

  const loadFields = async (entityType: FieldEntity) => {
    setIsLoadingFields(true);
    const res = await fetch(`/api/custom-fields?entityType=${entityType}`);
    setIsLoadingFields(false);
    if (!res.ok) {
      showToast("Failed to load custom fields", "error");
      return;
    }
    const data = await res.json();
    setFields(data.fields || []);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadFields(tab);
    });
  }, [tab]);

  const workspaceDisplayName = workspace?.name?.trim() ? workspace.name : "Untitled workspace";

  const onSaveWorkspace = async () => {
    if (!workspace) return;
    setIsSavingWorkspace(true);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workspaceName }),
    });
    setIsSavingWorkspace(false);

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update workspace", "error");
      return;
    }

    setWorkspace(data.workspace);
    setWorkspaceName(data.workspace?.name ?? "");
    setIsEditingWorkspace(false);
    showToast("Workspace updated", "success");
  };

  const openAddField = () => {
    setFieldForm(defaultForm(tab));
    setIsFieldFormOpen(true);
  };

  const openEditField = (field: CustomField) => {
    setFieldForm({
      id: field.id,
      entityType: field.entityType,
      name: field.name,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isActive: field.isActive,
      sortOrder: field.sortOrder,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      optionsText: field.options.join("\n"),
    });
    setIsFieldFormOpen(true);
  };

  const onSaveField = async () => {
    if (!fieldForm.name.trim()) {
      showToast("Field name is required", "error");
      return;
    }

    const options = fieldForm.optionsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (fieldForm.fieldType === "SELECT" && options.length === 0) {
      showToast("Select field requires at least one option", "error");
      return;
    }

    setIsSavingField(true);

    const payload = {
      entityType: fieldForm.entityType,
      name: fieldForm.name,
      fieldType: fieldForm.fieldType,
      isRequired: fieldForm.isRequired,
      isActive: fieldForm.isActive,
      sortOrder: Number(fieldForm.sortOrder) || 0,
      placeholder: fieldForm.placeholder || null,
      helpText: fieldForm.helpText || null,
      options,
    };

    const res = await fetch(fieldForm.id ? `/api/custom-fields/${fieldForm.id}` : "/api/custom-fields", {
      method: fieldForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSavingField(false);

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to save field", "error");
      return;
    }

    showToast(fieldForm.id ? "Field updated" : "Field created", "success");
    setIsFieldFormOpen(false);
    await loadFields(tab);
  };

  const onDeleteField = async (fieldId: string) => {
    const confirmed = await requestConfirm({
      title: "Delete custom field",
      message: "This will permanently delete the field and all saved values. Continue?",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    setDeletingFieldId(fieldId);
    const res = await fetch(`/api/custom-fields/${fieldId}`, { method: "DELETE" });
    setDeletingFieldId(null);
    if (!res.ok) {
      showToast("Failed to delete field", "error");
      return;
    }
    showToast("Field deleted", "success");
    await loadFields(tab);
  };

  const visibleFields = useMemo(() => [...fields].sort((a, b) => a.sortOrder - b.sortOrder), [fields]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <Link href="/settings/integrations" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">Open integrations</Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <div className="mt-3 space-y-2 text-sm">
              {!isEditingWorkspace ? (
                <div>
                  <div className="text-xs text-slate-400">Workspace name</div>
                  <div className="mt-1 text-base font-semibold text-slate-100">{workspaceDisplayName}</div>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Workspace name</label>
                  <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100" />
                </div>
              )}
              <div className="text-slate-300">Created: <span className="text-slate-100">{workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "—"}</span></div>
              <div className="text-slate-300">Users: <span className="text-slate-100">{usersCount}</span></div>
              <div className="text-slate-300">Plan: <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-200">Free</span></div>
            </div>

            {!isEditingWorkspace ? (
              <button onClick={() => setIsEditingWorkspace(true)} className="mt-4 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">Edit</button>
            ) : (
              <div className="mt-4 flex gap-2">
                <button onClick={onSaveWorkspace} disabled={isSavingWorkspace} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60">{isSavingWorkspace ? "Saving..." : "Save"}</button>
                <button onClick={() => setIsEditingWorkspace(false)} disabled={isSavingWorkspace} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">Cancel</button>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Users</h2>
            {users.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">No users in workspace yet.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {users.map((user) => (
                  <li key={user.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                      <span className={user.role === "OWNER" ? "rounded-full border border-amber-900 bg-amber-950 px-2 py-0.5 text-xs text-amber-300" : "rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300"}>{user.role === "OWNER" ? "Owner" : user.role || "Manager"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Custom Fields</h2>
            <button onClick={openAddField} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500">Add field</button>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={() => setTab("LEAD")} className={tab === "LEAD" ? "rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm text-white" : "rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"}>Lead fields</button>
            <button onClick={() => setTab("CONTACT")} className={tab === "CONTACT" ? "rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm text-white" : "rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"}>Contact fields</button>
          </div>

          {isLoadingFields ? (
            <div className="mt-3 text-sm text-slate-400">Loading fields...</div>
          ) : visibleFields.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">No custom fields yet for this entity.</div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Required</th>
                    <th className="p-2">Active</th>
                    <th className="p-2">Order</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFields.map((field) => (
                    <tr key={field.id} className="border-b border-slate-800">
                      <td className="p-2">
                        <div className="font-medium text-slate-100">{field.name}</div>
                        <div className="text-xs text-slate-500">{field.slug}</div>
                      </td>
                      <td className="p-2 text-slate-300">{field.fieldType}</td>
                      <td className="p-2 text-slate-300">{field.isRequired ? "Yes" : "No"}</td>
                      <td className="p-2 text-slate-300">{field.isActive ? "Yes" : "No"}</td>
                      <td className="p-2 text-slate-300">{field.sortOrder}</td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditField(field)} className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700">Edit</button>
                          <button disabled={deletingFieldId === field.id} onClick={() => onDeleteField(field.id)} className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950 disabled:opacity-60">{deletingFieldId === field.id ? "Deleting..." : "Delete"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isFieldFormOpen ? (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4">
              <h3 className="text-base font-semibold text-slate-100">{fieldForm.id ? "Edit field" : "Add field"}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Entity type</label>
                  <select disabled={Boolean(fieldForm.id)} value={fieldForm.entityType} onChange={(e) => setFieldForm((prev) => ({ ...prev, entityType: e.target.value as FieldEntity }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-60">
                    <option value="LEAD">Lead</option>
                    <option value="CONTACT">Contact</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Field name</label>
                  <input value={fieldForm.name} onChange={(e) => setFieldForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Field type</label>
                  <select disabled={Boolean(fieldForm.id)} value={fieldForm.fieldType} onChange={(e) => setFieldForm((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-60">
                    <option value="TEXT">Text</option>
                    <option value="TEXTAREA">Textarea</option>
                    <option value="NUMBER">Number</option>
                    <option value="DATE">Date</option>
                    <option value="SELECT">Select</option>
                    <option value="BOOLEAN">Boolean</option>
                    <option value="PHONE">Phone</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Sort order</label>
                  <input type="number" value={fieldForm.sortOrder} onChange={(e) => setFieldForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Placeholder</label>
                  <input value={fieldForm.placeholder} onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholder: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Help text</label>
                  <input value={fieldForm.helpText} onChange={(e) => setFieldForm((prev) => ({ ...prev, helpText: e.target.value }))} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
              </div>

              {fieldForm.fieldType === "SELECT" ? (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-slate-400">Options (one per line)</label>
                  <textarea value={fieldForm.optionsText} onChange={(e) => setFieldForm((prev) => ({ ...prev, optionsText: e.target.value }))} rows={4} className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fieldForm.isRequired} onChange={(e) => setFieldForm((prev) => ({ ...prev, isRequired: e.target.checked }))} /> Required</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fieldForm.isActive} onChange={(e) => setFieldForm((prev) => ({ ...prev, isActive: e.target.checked }))} /> Active</label>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={onSaveField} disabled={isSavingField} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60">{isSavingField ? "Saving..." : "Save"}</button>
                <button onClick={() => setIsFieldFormOpen(false)} disabled={isSavingField} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">Cancel</button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
