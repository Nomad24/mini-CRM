import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/app/components/Toaster";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { AuthGate } from "@/app/components/AuthGate";

export const metadata: Metadata = {
  title: "Mini CRM MVP",
  description: "Mini CRM for small business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased bg-slate-950 text-white">
        <Toaster />
        <ConfirmDialog />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
