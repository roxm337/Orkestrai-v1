import { notFound } from "next/navigation";

import { RunExecutionView } from "@/components/workflow/run-execution-view";
import { getRun } from "@/lib/api";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);

  if (!run) {
    notFound();
  }

  return (
    <div className="mx-auto w-[min(1320px,calc(100%-1.5rem))] space-y-6 py-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Execution view</p>
        <h1 className="font-display text-4xl tracking-[-0.05em] text-slate-950 md:text-5xl">Run {run.id}</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-500">Live run details.</p>
      </div>
      <RunExecutionView initialRun={run} />
    </div>
  );
}
