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
    <div className="mx-auto w-[min(1240px,calc(100%-1.5rem))] py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/55">Execution view</p>
        <h1 className="font-display text-5xl tracking-[-0.05em] text-ink">Run {run.id}</h1>
        <p className="max-w-3xl text-sm leading-7 text-ink/65">
          This screen streams local execution events, highlights the active node, and surfaces generated website
          outputs.
        </p>
      </div>
      <RunExecutionView initialRun={run} />
    </div>
  );
}
