"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthGateProps = {
  children: ReactNode;
};

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  const isPublicPath = useMemo(() => PUBLIC_PATHS.has(pathname || "/"), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (isPublicPath) {
        if (!cancelled) setIsChecking(false);
        return;
      }

      try {
        const res = await fetch("/api/me", { cache: "no-store" });

        if (cancelled) return;

        if (!res.ok) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          router.replace("/login");
          return;
        }

        setIsChecking(false);
      } catch {
        if (cancelled) return;
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/login");
      }
    }

    queueMicrotask(() => {
      if (!cancelled) setIsChecking(true);
    });
    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [isPublicPath, pathname, router]);

  if (isChecking && !isPublicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm">Checking session...</div>
      </div>
    );
  }

  return <>{children}</>;
}
