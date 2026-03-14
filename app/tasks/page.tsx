"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/app/components/TopNav";
import { showToast } from "@/lib/toast";

type Task = {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  lead: { title: string; id: string };
  assignee: { id: string; name: string; email: string };
};

type TaskTab = "ALL" | "OPEN" | "COMPLETED";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const [tab, setTab] = useState<TaskTab>("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        setError("Please login");
        return;
      }
      const data = await res.json();
      setTasks(data.tasks || []);
    }
    load();
  }, []);

  const assignees = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const task of tasks) uniq.set(task.assignee.id, task.assignee.name);
    return [{ id: "ALL", name: "All assignees" }, ...Array.from(uniq.entries()).map(([id, name]) => ({ id, name }))];
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (tab === "OPEN" && task.isCompleted) return false;
      if (tab === "COMPLETED" && !task.isCompleted) return false;
      if (selectedAssignee !== "ALL" && task.assignee.id !== selectedAssignee) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        task.lead.title.toLowerCase().includes(q) ||
        task.assignee.name.toLowerCase().includes(q)
      );
    });
  }, [tasks, tab, selectedAssignee, search]);

  const toggleTask = async (task: Task) => {
    if (togglingId) return;
    setTogglingId(task.id);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });
    setTogglingId(null);
    if (!res.ok) {
      showToast("Failed to update task", "error");
      return;
    }
    const data = await res.json();
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, isCompleted: data.task.isCompleted } : item)));
    showToast(data.task.isCompleted ? "Task completed" : "Task reopened", "success");
  };

  const dueDateClass = (dueDate: string | null, completed: boolean) => {
    if (!dueDate) return "text-slate-400";
    if (completed) return "text-slate-500";
    const due = new Date(dueDate);
    const now = new Date();
    const isSameDay = due.toDateString() === now.toDateString();
    if (due < now && !isSameDay) return "text-red-400";
    if (isSameDay) return "text-amber-300";
    return "text-slate-300";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <Link href="/leads" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">Create task</Link>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "OPEN", "COMPLETED"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={tab === item ? "rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm text-white" : "rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"}
              >
                {item === "ALL" ? "All" : item === "OPEN" ? "Open" : "Completed"}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks / lead / assignee"
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
            />
            <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mt-3 rounded border border-red-800 bg-red-950 p-2 text-red-300">{error}</div>}

        {tasks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-slate-700 bg-slate-950" />
            <h2 className="text-lg font-medium">No tasks yet</h2>
            <p className="mt-1 text-sm text-slate-400">Create a task to follow up on leads.</p>
            <Link href="/leads" className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">Create task</Link>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">No tasks match current filters.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3 hover:border-slate-600">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task)}
                    disabled={togglingId === task.id}
                    className={task.isCompleted ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-700 bg-emerald-900" : "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-500 bg-slate-800 hover:border-blue-400"}
                    title={task.isCompleted ? "Mark as open" : "Mark as completed"}
                  >
                    {task.isCompleted ? <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className={task.isCompleted ? "text-sm font-semibold text-slate-300 line-through" : "text-sm font-semibold text-slate-100"}>{task.title}</div>
                    <div className={task.isCompleted ? "mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500" : "mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"}>
                      <Link className="text-sky-300 hover:underline" href={`/leads/${task.lead.id}`}>{task.lead.title}</Link>
                      <span>•</span>
                      <span>{task.assignee.name}</span>
                      <span>•</span>
                      <span className={dueDateClass(task.dueDate, task.isCompleted)}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                      </span>
                      <span className={task.isCompleted ? "rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-emerald-300" : "rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300"}>
                        {task.isCompleted ? "Completed" : "Open"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
