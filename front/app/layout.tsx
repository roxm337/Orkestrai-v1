import Link from "next/link";
import type { Metadata } from "next";
import { LayoutGrid, Plus } from "lucide-react";

import "./globals.css";

export const metadata: Metadata = {
  title: "ScrapeFlow",
  description: "Local multi-agent automation for lead generation and website creation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
            <div className="app-shell flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  <span className="font-display text-3xl tracking-[-0.05em] text-slate-950">ScrapeFlow</span>
                </Link>
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 md:inline-flex">
                  Workflow OS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 md:flex">
                  <Link className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href="/">
                    Dashboard
                  </Link>
                  <Link className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href="/workflows/new">
                    Sample flow
                  </Link>
                </nav>
                <Link
                  href="/workflows/new?mode=blank"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
                >
                  <Plus className="h-4 w-4" />
                  New workflow
                </Link>
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-72px)]">
            <div className="app-shell py-6 md:py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
