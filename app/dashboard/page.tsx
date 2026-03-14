"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopNav } from "@/app/components/TopNav";

function statusClass(status: string) {
  if (status === "DONE") return "border-emerald-800 bg-emerald-950 text-emerald-300";
  if (status === "LOST") return "border-red-800 bg-red-950 text-red-300";
  if (status === "NEW") return "border-sky-800 bg-sky-950 text-sky-300";
  return "border-slate-600 bg-slate-800 text-slate-300";
}

type Lead = { id: string; title: string; status: string; createdAt: string; contact: { name: string } };
type Task = { id: string; title: string; isCompleted: boolean; dueDate: string | null; lead: { title: string; id: string } };

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/leads");
      if (!res.ok) { setError("Please login first"); return; }
      const data = await res.json();
      setLeads(data.leads ?? []);
      const tasksRes = await fetch("/api/tasks");
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks ?? []);
      }
    }
    load();
  }, []);

  const toggleTask = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, isCompleted: data.task.isCompleted } : t));
    }
  };

  const openTasks = tasks.filter((t) => !t.isCompleted);
  const doneTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        {error && <div className="mt-2 rounded border border-red-800 bg-red-950 p-2 text-red-300">{error}</div>}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">New leads</div>
            <div className="mt-3 text-4xl font-bold leading-none">{leads.filter((l) => l.status === "NEW").length}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Active leads</div>
            <div className="mt-3 text-4xl font-bold leading-none">{leads.filter((l) => l.status !== "DONE" && l.status !== "LOST").length}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Tasks</div>
            <div className="mt-3 text-4xl font-bold leading-none">{openTasks.length}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Latest leads</h2>
              <Link className="text-xs text-sky-400 hover:underline" href="/leads">View all</Link>
            </div>
            {leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-5 text-center">
                <h3 className="font-medium text-slate-100">No leads yet</h3>
                <p className="mt-1 text-sm text-slate-400">Create your first lead to start tracking customers.</p>
                <Link href="/leads/new" className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">Create lead</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 6).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 hover:border-slate-600">
                    <div className="min-w-0 flex-1">
                      <Link href={`/leads/${lead.id}`} className="truncate text-base font-semibold text-slate-100 hover:underline">{lead.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{lead.contact?.name}</span>
                        <span>•</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(lead.status)}`}>{lead.status}</span>
                      </div>
                    </div>
                    <Link href={`/leads/${lead.id}`} className="ml-3 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-700">Open</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <Link className="text-xs text-sky-400 hover:underline" href="/tasks">View all</Link>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-5 text-center">
                <p className="text-sm text-slate-400">No tasks yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {openTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                    <button onClick={() => toggleTask(task)} className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-500 bg-slate-800 hover:border-blue-400" title="Mark as done" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-slate-100">{task.title}</div>
                      <Link href={`/leads/${task.lead?.id}`} className="truncate text-xs text-slate-400 hover:underline">{task.lead?.title}</Link>
                    </div>
                    <span className={`shrink-0 text-xs ${task.dueDate && new Date(task.dueDate) < new Date() ? "text-red-400" : "text-slate-400"}`}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due"}
                    </span>
                  </div>
                ))}
                {doneTasks.length > 0 && (
                  <>
                    <div className="pt-1 text-xs text-slate-500">Completed ({doneTasks.length})</div>
                    {doneTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 opacity-60">
                        <button onClick={() => toggleTask(task)} className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-700 bg-emerald-900" title="Mark as not done">
                          <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-slate-400 line-through">{task.title}</div>
                          <Link href={`/leads/${task.lead?.id}`} className="truncate text-xs text-slate-500 hover:underline">{task.lead?.title}</Link>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due"}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
