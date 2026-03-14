"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div suppressHydrationWarning className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
      <div className="w-full max-w-md rounded border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Login</h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40" />
          {error && <div className="text-red-400">{error}</div>}
          <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-500">Sign in</button>
        </form>
        <div className="mt-3 text-sm text-slate-300">No account? <a className="text-sky-300" href="/register">Register</a></div>
      </div>
    </div>
  );
}
