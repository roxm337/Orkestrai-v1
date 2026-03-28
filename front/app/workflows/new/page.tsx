import Link from "next/link";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { Button } from "@/components/ui/button";
import { getNodeCatalog, getSampleWorkflow } from "@/lib/api";
import { emptyWorkflow } from "@/types/workflow";

export default async function NewWorkflowPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const [nodeCatalog, sampleWorkflow] = await Promise.all([getNodeCatalog(), getSampleWorkflow()]);
  const mode = modeParam === "blank" ? "blank" : "sample";
  const seedWorkflow = mode === "blank" ? emptyWorkflow : sampleWorkflow;

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/55">Workflow builder</p>
        <h1 className="font-display text-5xl tracking-[-0.05em] text-ink">Design a local automation pipeline</h1>
        <p className="max-w-3xl text-sm leading-7 text-ink/65">
          {mode === "blank"
            ? "Start from a blank canvas, then add only the nodes you want."
            : "Start from the sample flow, then drag in the steps you want. The first production loop stays deterministic, while Groq handles the analysis layer."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/workflows/new?mode=blank">
          <Button variant={mode === "blank" ? "accent" : "secondary"}>Start from scratch</Button>
        </Link>
        <Link href="/workflows/new">
          <Button variant={mode === "sample" ? "accent" : "secondary"}>Use sample flow</Button>
        </Link>
      </div>
      <WorkflowBuilder key={mode} initialWorkflow={null} nodeCatalog={nodeCatalog} seedWorkflow={seedWorkflow} />
    </div>
  );
}
