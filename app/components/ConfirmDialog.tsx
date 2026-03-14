"use client";
import { useEffect, useState } from "react";

type ConfirmState = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  resolve: (result: boolean) => void;
} | null;

export function ConfirmDialog() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  useEffect(() => {
    const onConfirm = (event: Event) => {
      const custom = event as CustomEvent<ConfirmState>;
      if (!custom.detail) return;
      setConfirmState(custom.detail);
    };

    window.addEventListener("app-confirm", onConfirm as EventListener);
    return () => window.removeEventListener("app-confirm", onConfirm as EventListener);
  }, []);

  if (!confirmState) return null;

  const close = (result: boolean) => {
    confirmState.resolve(result);
    setConfirmState(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-100">{confirmState.title || "Please confirm"}</h3>
        <p className="mt-2 text-sm text-slate-300">{confirmState.message}</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => close(false)}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700"
          >
            {confirmState.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            className={confirmState.destructive
              ? "rounded-md border border-red-900 bg-red-950 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900"
              : "rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"}
          >
            {confirmState.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
