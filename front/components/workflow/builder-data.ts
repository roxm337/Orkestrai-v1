import type { Edge } from "@xyflow/react";

import { fallbackNodeCatalog, type NodeCatalogItem, type NodeType, type WorkflowNode, type WorkflowRecord, type WorkflowRun } from "@/types/workflow";

export type BuilderTemplate = {
  id: string;
  name: string;
  description: string;
  focus: string;
  nodeTypes: NodeType[];
};

export type AgentPreset = {
  id: string;
  name: string;
  role: string;
  voice: string;
  behavior: string;
  prompt: string;
};

export type SidebarSection = {
  id: string;
  label: string;
  hint: string;
};

export type CommandPreset = {
  id: string;
  title: string;
  description: string;
  action: "template" | "node";
  templateId?: string;
  nodeType?: NodeType;
};

export const sidebarSections: SidebarSection[] = [
  { id: "workflows", label: "Workflows", hint: "Flows" },
  { id: "agents", label: "Agents", hint: "Roles" },
  { id: "executions", label: "Executions", hint: "Logs" },
  { id: "templates", label: "Templates", hint: "Prebuilt journeys" },
  { id: "settings", label: "Settings", hint: "Runtime" }
];

export const agentPresets: AgentPreset[] = [
  {
    id: "sales-concierge",
    name: "Ava",
    role: "Sales concierge",
    voice: "Warm, concise, consultative",
    behavior: "Soft, medium depth",
    prompt: "Guide leads toward a quick call while keeping the exchange human and insight-led."
  },
  {
    id: "qualification-analyst",
    name: "Signal",
    role: "Qualification analyst",
    voice: "Sharp, analytical, low-noise",
    behavior: "Strict qualification",
    prompt: "Prioritize lead fit, intent, and timing signals before the team spends outbound effort."
  },
  {
    id: "revops-closer",
    name: "North",
    role: "RevOps closer",
    voice: "Direct, confident, outcome-focused",
    behavior: "Fast, direct routing",
    prompt: "Route high-value leads to the fastest revenue path and surface the strongest next action."
  }
];

export const builderTemplates: BuilderTemplate[] = [
  {
    id: "lead-qualification",
    name: "Lead capture to qualification",
    description: "Source, enrich, score, ship site.",
    focus: "Inbound prospecting",
    nodeTypes: ["scraper", "enrichment", "analysis", "website_generator"]
  },
  {
    id: "cold-outreach",
    name: "Cold outreach automation",
    description: "Qualify, branch, follow up.",
    focus: "Outbound",
    nodeTypes: ["scraper", "enrichment", "analysis", "if_else", "whatsapp"]
  },
  {
    id: "microsite-loop",
    name: "Qualification to microsite",
    description: "Turn leads into microsites.",
    focus: "Microsites",
    nodeTypes: ["scraper", "enrichment", "analysis", "website_generator"]
  }
];

export const commandPresets: CommandPreset[] = [
  {
    id: "cmd-lead-flow",
    title: "Create lead gen workflow",
    description: "Load the full lead-to-site flow.",
    action: "template",
    templateId: "lead-qualification"
  },
  {
    id: "cmd-whatsapp",
    title: "Add WhatsApp node",
    description: "Insert a follow-up step.",
    action: "node",
    nodeType: "whatsapp"
  },
  {
    id: "cmd-pipeline",
    title: "Generate pipeline",
    description: "Build an outreach flow.",
    action: "template",
    templateId: "cold-outreach"
  },
  {
    id: "cmd-api",
    title: "Add CRM sync",
    description: "Insert an API node.",
    action: "node",
    nodeType: "api_call"
  }
];

export const settingsCards = [
  { label: "Agent runtime", value: "Local workers", description: "Runs locally." },
  { label: "Sync mode", value: "Live draft", description: "Saves instantly." },
  { label: "Execution surface", value: "Realtime", description: "Logs stay close." }
];

export function mergeCatalog(remoteCatalog: NodeCatalogItem[]) {
  const byType = new Map(fallbackNodeCatalog.map((item) => [item.type, item]));
  for (const item of remoteCatalog) {
    const fallback = byType.get(item.type);
    byType.set(item.type, {
      type: item.type,
      label: item.label,
      description: item.description,
      accent: item.accent ?? fallback?.accent ?? "#7c3aed",
      category: item.category ?? fallback?.category ?? "action",
      runtime: item.runtime ?? fallback?.runtime ?? "ready",
      inputs: item.inputs ?? fallback?.inputs ?? ["input"],
      outputs: item.outputs ?? fallback?.outputs ?? ["output"],
      defaultConfig: {
        ...(fallback?.defaultConfig ?? {}),
        ...(item.defaultConfig ?? {})
      }
    });
  }

  return Array.from(byType.values());
}

export function buildTemplateGraph(template: BuilderTemplate, catalog: NodeCatalogItem[]) {
  const catalogMap = new Map(catalog.map((item) => [item.type, item]));
  const nodes: WorkflowNode[] = template.nodeTypes.map((type, index) => {
    const item = catalogMap.get(type) ?? fallbackNodeCatalog.find((entry) => entry.type === type) ?? fallbackNodeCatalog[0];
    return {
      id: `${type}-${index + 1}`,
      type: "workflowNode",
      position: {
        x: 120 + index * 320,
        y: 220 + (index % 2 === 0 ? 0 : 100)
      },
      data: {
        type: item.type,
        label: item.label,
        description: item.description,
        category: item.category,
        runtime: item.runtime,
        accent: item.accent,
        inputs: item.inputs,
        outputs: item.outputs,
        config: { ...item.defaultConfig }
      }
    };
  });

  const edges: Edge[] = nodes.slice(1).map((node, index) => ({
    id: `${template.id}-edge-${index + 1}`,
    source: nodes[index].id,
    target: node.id
  }));

  return {
    name: template.name,
    description: template.description,
    nodes,
    edges
  };
}

export function summarizeRuns(runs: WorkflowRun[]) {
  return runs
    .slice(0, 4)
    .map((run) => ({
      id: run.id,
      label: run.current_node_label ?? "Queued workflow",
      progress: Math.round((run.progress ?? 0) * 100),
      status: run.status
    }));
}

export function summarizeWorkflows(workflows: WorkflowRecord[]) {
  return workflows.slice(0, 5).map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description
  }));
}
