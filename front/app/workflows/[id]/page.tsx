import { notFound } from "next/navigation";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { getNodeCatalog, getSampleWorkflow, getWorkflow } from "@/lib/api";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workflow, nodeCatalog, sampleWorkflow] = await Promise.all([
    getWorkflow(id),
    getNodeCatalog(),
    getSampleWorkflow()
  ]);

  if (!workflow) {
    notFound();
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/55">Workflow editor</p>
        <h1 className="font-display text-5xl tracking-[-0.05em] text-ink">{workflow.name}</h1>
        <p className="max-w-3xl text-sm leading-7 text-ink/65">{workflow.description}</p>
      </div>
      <WorkflowBuilder initialWorkflow={workflow} nodeCatalog={nodeCatalog} seedWorkflow={sampleWorkflow} />
    </div>
  );
}
