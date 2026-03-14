import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 p-6 bg-slate-900 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Mini CRM MVP</h1>
        <p className="mt-2 text-slate-300">A simple CRM for leads, clients, notes, and tasks.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/login" className="rounded bg-blue-600 px-3 py-2 text-white">Login</Link>
          <Link href="/register" className="rounded border border-slate-500 px-3 py-2 text-slate-200">Register</Link>
        </div>
      </div>
    </div>
  );
}
