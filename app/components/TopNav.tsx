"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    async function loadWorkspace() {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = await res.json();
      setWorkspaceName(data.workspace?.name ?? "");
    }
    loadWorkspace();
  }, []);

  const navClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return isActive
      ? "rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-white"
      : "rounded-md px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white";
  };

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 py-5 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6">
        <div>
          <div className="text-xl font-bold tracking-tight">Mini CRM</div>
          {workspaceName ? <div className="text-xs text-slate-400">{workspaceName}</div> : null}
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link className={navClass("/dashboard")} href="/dashboard">Dashboard</Link>
          <Link className={navClass("/leads")} href="/leads">Leads</Link>
          <Link className={navClass("/contacts")} href="/contacts">Contacts</Link>
          <Link className={navClass("/tasks")} href="/tasks">Tasks</Link>
          <Link className={navClass("/inbox")} href="/inbox">Inbox</Link>
          <Link className={navClass("/settings")} href="/settings">Settings</Link>
          <button onClick={onLogout} className="ml-6 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white">Logout</button>
        </nav>
      </div>
    </header>
  );
}
