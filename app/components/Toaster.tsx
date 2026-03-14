"use client";
import { useEffect, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ message: string; type?: "success" | "error" | "info" }>;
      const message = custom.detail?.message;
      const type = custom.detail?.type || "info";
      if (!message) return;
      const id = `${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 2600);
    };

    window.addEventListener("app-toast", handler as EventListener);
    return () => window.removeEventListener("app-toast", handler as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={toast.type === "success"
            ? "rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300 shadow"
            : toast.type === "error"
              ? "rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300 shadow"
              : "rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow"}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
