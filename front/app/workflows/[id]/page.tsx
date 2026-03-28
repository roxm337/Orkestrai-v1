import { notFound } from "next/navigation";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { getNodeCatalog, getRuns, getSampleWorkflow, getWorkflow, getWorkflows } from "@/lib/api";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workflow, nodeCatalog, sampleWorkflow, workflows, runs] = await Promise.all([
    getWorkflow(id),
    getNodeCatalog(),
    getSampleWorkflow(),
    getWorkflows(),
    getRuns()
  ]);

  if (!workflow) {
    notFound();
  }

  return (
    <WorkflowBuilder
      initialWorkflow={workflow}
      nodeCatalog={nodeCatalog}
      seedWorkflow={sampleWorkflow}
      workflows={workflows}
      runs={runs}
    />
  );
}
