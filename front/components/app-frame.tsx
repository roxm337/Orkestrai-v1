"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, LayoutGrid, Plus, Sparkles } from "lucide-react";

type AppFrameProps = {
  children: React.ReactNode;
};

function isBuilderRoute(pathname: string) {
  return pathname.startsWith("/workflows/");
}

export function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const builderRoute = isBuilderRoute(pathname);

  if (builderRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/78 backdrop-blur-2xl">
        <div className="app-shell flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(124,58,237,0.96),rgba(59,130,246,0.82))] text-white shadow-[0_14px_32px_rgba(124,58,237,0.26)]">
                <LayoutGrid className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold tracking-[-0.04em] text-slate-950">Lead OS</p>
                <p className="text-xs text-slate-500">Workflow OS</p>
              </div>
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
              <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
              AI-native automation
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 md:flex">
              <Link className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/">
                Overview
              </Link>
              <Link className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/workflows/new">
                Builder
              </Link>
            </nav>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 lg:flex">
              <Command className="h-3.5 w-3.5" />
              Cmd/Ctrl + K
            </div>

            <Link
              href="/workflows/new?mode=blank"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgba(124,58,237,0.96),rgba(59,130,246,0.86))] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(124,58,237,0.26)] transition hover:scale-[1.01]"
            >
              <Plus className="h-4 w-4" />
              New workflow
            </Link>
          </div>
        </div>
      </header>

      <main className="app-shell py-6 md:py-8">{children}</main>
    </div>
  );
}
