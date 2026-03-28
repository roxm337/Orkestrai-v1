import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { getNodeCatalog, getRuns, getSampleWorkflow, getWorkflows } from "@/lib/api";
import { emptyWorkflow } from "@/types/workflow";

export default async function NewWorkflowPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const [nodeCatalog, sampleWorkflow, workflows, runs] = await Promise.all([
    getNodeCatalog(),
    getSampleWorkflow(),
    getWorkflows(),
    getRuns()
  ]);
  const mode = modeParam === "blank" ? "blank" : "sample";
  const seedWorkflow = mode === "blank" ? emptyWorkflow : sampleWorkflow;

  return (
    <WorkflowBuilder
      key={mode}
      initialWorkflow={null}
      nodeCatalog={nodeCatalog}
      seedWorkflow={seedWorkflow}
      workflows={workflows}
      runs={runs}
    />
  );
}
