"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  MarkerType,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import {
  Activity,
  ArrowLeft,
  Bot,
  BrainCircuit,
  Command,
  CornerDownRight,
  LayoutGrid,
  PanelsTopLeft,
  Play,
  Plus,
  Save,
  Settings2,
  Sparkles,
  SquareStack,
  WandSparkles
} from "lucide-react";

import { createRun, createWorkflow, updateWorkflow } from "@/lib/api";
import {
  agentPresets,
  buildTemplateGraph,
  builderTemplates,
  commandPresets,
  mergeCatalog,
  settingsCards,
  sidebarSections,
  summarizeRuns,
  summarizeWorkflows,
  type BuilderTemplate,
  type CommandPreset
} from "@/components/workflow/builder-data";
import { CommandPalette } from "@/components/workflow/command-palette";
import { WorkflowNodeCard, type WorkflowCanvasNode } from "@/components/workflow/custom-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NodeCatalogItem, WorkflowConfigValue, WorkflowPayload, WorkflowRecord, WorkflowRun } from "@/types/workflow";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
  workflowNode: WorkflowNodeCard
};

const railIcons = {
  workflows: LayoutGrid,
  agents: Bot,
  executions: Activity,
  templates: SquareStack,
  settings: Settings2
};

type BuilderProps = {
  initialWorkflow: WorkflowRecord | null;
  nodeCatalog: NodeCatalogItem[];
  seedWorkflow: WorkflowPayload;
  workflows: WorkflowRecord[];
  runs: WorkflowRun[];
};

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildNode(template: NodeCatalogItem, index: number, anchor?: { x: number; y: number }): WorkflowCanvasNode {
  return {
    id: `${template.type}-${crypto.randomUUID()}`,
    type: "workflowNode",
    position: {
      x: anchor ? anchor.x + 280 : 100 + (index % 3) * 300,
      y: anchor ? anchor.y + (index % 2 === 0 ? -40 : 120) : 160 + Math.floor(index / 3) * 220
    },
    data: {
      type: template.type,
      label: template.label,
      description: template.description,
      category: template.category,
      runtime: template.runtime,
      accent: template.accent,
      inputs: template.inputs,
      outputs: template.outputs,
      config: { ...template.defaultConfig }
    }
  };
}

function hydrateNodes(nodes: WorkflowCanvasNode[], catalogMap: Map<string, NodeCatalogItem>) {
  return nodes.map((node) => {
    const item = catalogMap.get(node.data.type);
    return {
      ...node,
      data: {
        ...node.data,
        category: node.data.category ?? item?.category ?? "action",
        runtime: node.data.runtime ?? item?.runtime ?? "ready",
        accent: node.data.accent ?? item?.accent ?? "#7c3aed",
        inputs: node.data.inputs ?? item?.inputs ?? ["input"],
        outputs: node.data.outputs ?? item?.outputs ?? ["output"],
        config: {
          ...(item?.defaultConfig ?? {}),
          ...(node.data.config ?? {})
        }
      }
    };
  });
}

function buildPreview(node: WorkflowCanvasNode | null) {
  if (!node) {
    return {
      input: "Select a node to inspect how lead data flows through the system.",
      transform: "The right panel turns into a live configuration and preview surface.",
      output: "You will see expected outputs, routing signals, and runtime readiness here."
    };
  }

  const category = node.data.category ?? "action";
  const config = node.data.config ?? {};

  if (category === "ai") {
    return {
      input: `Incoming context: ${(node.data.inputs ?? []).join(", ") || "lead profile"}`,
      transform: `Prompt focus: ${String(config.prompt ?? config.profileFocus ?? "Qualify and summarize lead intent")}`,
      output: `Structured AI result: ${(node.data.outputs ?? []).join(", ") || "qualified lead"}`
    };
  }

  if (category === "logic") {
    return {
      input: `Branch signal: ${(node.data.inputs ?? []).join(", ") || "lead score"}`,
      transform: `Rule: ${String(config.condition ?? "Evaluate node condition")}`,
      output: `Routes: ${(node.data.outputs ?? []).join(" / ") || "true and false branches"}`
    };
  }

  if (category === "trigger") {
    return {
      input: `Trigger source: ${String(config.path ?? config.formName ?? config.cadence ?? "Inbound event")}`,
      transform: "Normalize the incoming payload and attach workflow context.",
      output: `Ready payload: ${(node.data.outputs ?? []).join(", ") || "lead event"}`
    };
  }

  return {
    input: `Source data: ${(node.data.inputs ?? []).join(", ") || "lead input"}`,
    transform: `Core operation: ${String(config.endpoint ?? config.keyword ?? config.mode ?? node.data.description)}`,
    output: `Deliverable: ${(node.data.outputs ?? []).join(", ") || "transformed payload"}`
  };
}

function coerceConfigValue(rawValue: string, currentValue: WorkflowConfigValue) {
  if (typeof currentValue === "number") {
    const parsed = Number(rawValue);
    return Number.isNaN(parsed) ? currentValue : parsed;
  }

  return rawValue;
}

export function WorkflowBuilder({ initialWorkflow, nodeCatalog, seedWorkflow, workflows, runs }: BuilderProps) {
  const catalog = useMemo(() => mergeCatalog(nodeCatalog), [nodeCatalog]);
  const catalogMap = useMemo(() => new Map(catalog.map((item) => [item.type, item])), [catalog]);
  const source = useMemo(
    () =>
      initialWorkflow ?? {
        id: "",
        ...seedWorkflow,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
    [initialWorkflow, seedWorkflow]
  );
  const hydratedNodes = useMemo(
    () => hydrateNodes(source.definition.nodes as WorkflowCanvasNode[], catalogMap),
    [catalogMap, source.definition.nodes]
  );

  const [workflowId, setWorkflowId] = useState(initialWorkflow?.id ?? "");
  const [name, setName] = useState(source.name);
  const [description, setDescription] = useState(source.description);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNode>(hydratedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(source.definition.edges as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(hydratedNodes[0]?.id ?? null);
  const [notice, setNotice] = useState("Ready to shape your lead generation OS.");
  const [isPending, startTransition] = useTransition();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeSidebarSection, setActiveSidebarSection] = useState<string>("templates");

  const deferredCommandQuery = useDeferredValue(commandQuery);
  const currentRun = useMemo(
    () => runs.find((run) => run.workflow_id === workflowId) ?? runs[0] ?? null,
    [runs, workflowId]
  );
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );
  const activeSidebarMeta = useMemo(
    () => sidebarSections.find((section) => section.id === activeSidebarSection) ?? sidebarSections[0],
    [activeSidebarSection]
  );
  const preview = useMemo(() => buildPreview(selectedNode), [selectedNode]);
  const workflowSummaries = useMemo(() => summarizeWorkflows(workflows), [workflows]);
  const runSummaries = useMemo(() => summarizeRuns(runs), [runs]);
  const filteredPresets = useMemo(() => {
    if (!deferredCommandQuery.trim()) {
      return commandPresets;
    }

    const query = deferredCommandQuery.toLowerCase();
    return commandPresets.filter((preset) => `${preset.title} ${preset.description}`.toLowerCase().includes(query));
  }, [deferredCommandQuery]);
  const activeNodeId = currentRun?.current_node_id ?? null;
  const canvasNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === activeNodeId
        }
      })),
    [activeNodeId, nodes]
  );
  const canvasEdges = useMemo(
    () =>
      edges.map((edge) => {
        const active = edge.source === activeNodeId || edge.target === activeNodeId;
        return {
          ...edge,
          animated: true,
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: active ? "#8b5cf6" : "rgba(148,163,184,0.5)"
          },
          style: {
            stroke: active ? "#8b5cf6" : "rgba(148,163,184,0.5)",
            strokeWidth: active ? 2.4 : 1.5
          }
        };
      }),
    [activeNodeId, edges]
  );
  const selectedNodeLogs = useMemo(() => {
    const logs = currentRun?.logs ?? [];
    if (!selectedNode) {
      return logs.slice(-4).reverse();
    }

    return logs
      .filter((entry) => entry.nodeId === selectedNode.id || entry.nodeLabel === selectedNode.data.label)
      .slice(-4)
      .reverse();
  }, [currentRun?.logs, selectedNode]);
  const runnable = nodes.length > 0 && nodes.every((node) => (node.data.runtime ?? "ready") === "ready");
  const selectedAgent = selectedNode ? String(selectedNode.data.config.agent ?? "") : "";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setIsPaletteOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    setEdges((current) =>
      addEdge(
        {
          ...connection,
          id: crypto.randomUUID(),
          type: "smoothstep",
          animated: true
        },
        current
      )
    );
  }

  function handleAddNode(type: string) {
    const template = catalogMap.get(type);
    if (!template) {
      setNotice("That node is not available in the current catalog.");
      return;
    }

    const anchor = selectedNode?.position;
    const node = buildNode(template, nodes.length, anchor ? { x: anchor.x, y: anchor.y } : undefined);
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
    setNotice(`${template.label} added to the canvas.`);
  }

  function handleTemplateApply(template: BuilderTemplate) {
    const graph = buildTemplateGraph(template, catalog);
    setName(graph.name);
    setDescription(graph.description);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
    setNotice(`${template.name} loaded into the canvas.`);
  }

  function updateSelectedNode(field: "label" | "description", value: string) {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value
              }
            }
          : node
      )
    );
  }

  function updateSelectedNodeConfig(key: string, value: WorkflowConfigValue) {
    if (!selectedNodeId) {
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  [key]: value
                }
              }
            }
          : node
      )
    );
  }

  function handleCommand(preset: CommandPreset) {
    if (preset.action === "node" && preset.nodeType) {
      handleAddNode(preset.nodeType);
    }

    if (preset.action === "template" && preset.templateId) {
      const template = builderTemplates.find((entry) => entry.id === preset.templateId);
      if (template) {
        handleTemplateApply(template);
      }
    }

    setIsPaletteOpen(false);
    setCommandQuery("");
  }

  function handleOpenSection(sectionId: string) {
    setActiveSidebarSection(sectionId);
    setSelectedNodeId(null);
  }

  function createPayload(): WorkflowPayload {
    return {
      name,
      description,
      definition: {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: "workflowNode",
          position: node.position,
          data: {
            type: node.data.type,
            label: node.data.label,
            description: node.data.description,
            category: node.data.category,
            runtime: node.data.runtime,
            accent: node.data.accent,
            inputs: node.data.inputs,
            outputs: node.data.outputs,
            config: node.data.config
          }
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target
        })),
        viewport: source.definition.viewport
      }
    };
  }

  async function persistWorkflow() {
    const payload = createPayload();
    const saved = workflowId ? await updateWorkflow(workflowId, payload) : await createWorkflow(payload);
    setWorkflowId(saved.id);
    setNotice("Workflow saved locally and ready for the next run.");
    return saved;
  }

  function handleSave() {
    startTransition(() => {
      void (async () => {
        try {
          await persistWorkflow();
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Failed to save workflow.");
        }
      })();
    });
  }

  function handleRun() {
    if (!runnable) {
      setNotice("This workflow includes design-only nodes. Remove them or swap in local-agent-ready nodes to run.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const workflow = await persistWorkflow();
          const run = await createRun(workflow.id);
          setNotice(`Run queued. Opening execution ${run.id}.`);
          window.location.href = `/runs/${run.id}`;
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Failed to queue run.");
        }
      })();
    });
  }

  function renderConfigField(key: string, value: WorkflowConfigValue) {
    if (typeof value === "boolean") {
      return (
        <button
          type="button"
          onClick={() => updateSelectedNodeConfig(key, !value)}
          className={cn(
            "flex h-11 items-center justify-between rounded-[18px] border px-4 text-sm transition",
            value
              ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.08] text-slate-950"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
          )}
        >
          <span>{titleCase(key)}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{value ? "On" : "Off"}</span>
        </button>
      );
    }

    const isLongText = key.toLowerCase().includes("prompt") || key.toLowerCase().includes("message") || String(value).length > 72;
    if (isLongText) {
      return (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{titleCase(key)}</label>
          <Textarea value={String(value)} onChange={(event) => updateSelectedNodeConfig(key, event.target.value)} className="min-h-[112px]" />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{titleCase(key)}</label>
        <Input
          type={typeof value === "number" ? "number" : "text"}
          value={String(value)}
          onChange={(event) => updateSelectedNodeConfig(key, coerceConfigValue(event.target.value, value))}
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen p-4 xl:p-5">
        <div className="grid gap-4 xl:grid-cols-[84px,minmax(0,1fr),320px]">
          <aside className="workflow-panel flex h-[calc(100vh-2rem)] flex-col items-center gap-3 px-3 py-4 xl:h-[calc(100vh-2.5rem)]">
            <Link
              href="/"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(124,58,237,0.96),rgba(59,130,246,0.82))] text-white shadow-[0_14px_32px_rgba(124,58,237,0.26)]"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>

            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[#8b5cf6] transition hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/[0.06]"
              title="Open command palette"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>

            <div className="my-2 h-px w-10 bg-slate-200" />

            <div className="flex flex-1 flex-col items-center gap-2">
              {sidebarSections.map((section) => {
                const Icon = railIcons[section.id as keyof typeof railIcons] ?? PanelsTopLeft;
                const active = !selectedNode && activeSidebarSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleOpenSection(section.id)}
                    title={section.label}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border transition",
                      active
                        ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.08] text-[#7c3aed]"
                        : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                title="Save workflow"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <Save className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={isPending}
                title="Run workflow"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(124,58,237,0.96),rgba(59,130,246,0.86))] text-white shadow-[0_12px_32px_rgba(124,58,237,0.2)] transition hover:scale-[1.01] disabled:opacity-50"
              >
                <Play className="h-4.5 w-4.5" />
              </button>
            </div>
          </aside>

          <section className="workflow-panel flex h-[calc(100vh-2rem)] flex-col overflow-hidden xl:h-[calc(100vh-2.5rem)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Editor
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {runnable ? "Ready" : "Mixed"}
                  </span>
                </div>
                <h1 className="mt-2 truncate text-xl font-semibold tracking-[-0.04em] text-slate-950 md:text-2xl">
                  {name || "Untitled workflow"}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen(true)}
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
                >
                  <Command className="mr-2 h-4 w-4" />
                  Cmd K
                </button>
                <Button variant="secondary" onClick={handleSave} disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="accent" onClick={handleRun} disabled={isPending}>
                  <Play className="mr-2 h-4 w-4" />
                  Run
                </Button>
              </div>
            </div>

            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>

              {nodes.length === 0 ? (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-slate-200 bg-white/96 px-6 py-6 text-center shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6]">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-xl font-semibold text-slate-950">Start with a template</p>
                  <p className="mt-2 text-sm text-slate-500">Or press Cmd + K.</p>
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
                <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-white/96 px-3 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <WandSparkles className="mr-2 h-4 w-4 text-[#8b5cf6]" />
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSection("templates")}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <SquareStack className="mr-2 h-4 w-4 text-[#8b5cf6]" />
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSection("workflows")}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <LayoutGrid className="mr-2 h-4 w-4 text-[#8b5cf6]" />
                    Workflows
                  </button>
                </div>
              </div>

              <ReactFlow
                nodes={canvasNodes}
                edges={canvasEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                connectionLineStyle={{ stroke: "#8b5cf6", strokeWidth: 2 }}
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                  type: "smoothstep",
                  animated: true
                }}
                className="workflow-canvas"
              >
                <Background gap={22} color="rgba(148,163,184,0.18)" />
                <MiniMap
                  pannable
                  zoomable
                  maskColor="rgba(241,245,249,0.84)"
                  nodeColor={(node) => String(node.data?.accent ?? "#8b5cf6")}
                  className="!border-slate-200 !bg-white/92"
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </section>

          <aside className="workflow-panel flex h-[calc(100vh-2rem)] flex-col overflow-hidden xl:h-[calc(100vh-2.5rem)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {selectedNode ? "Node" : activeSidebarMeta.label}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                {selectedNode ? selectedNode.data.label : activeSidebarMeta.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{selectedNode ? "Configure" : activeSidebarMeta.hint}</p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {selectedNode ? (
                <>
                  <section className="space-y-3">
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Node name</label>
                        <Input value={selectedNode.data.label} onChange={(event) => updateSelectedNode("label", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Description</label>
                        <Textarea
                          value={selectedNode.data.description}
                          onChange={(event) => updateSelectedNode("description", event.target.value)}
                          className="min-h-[88px]"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Inputs / Outputs</p>
                      <span className="text-[11px] text-slate-500">{selectedNode.data.runtime === "ready" ? "Ready" : "Design"}</span>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inputs</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedNode.data.inputs ?? []).map((input) => (
                            <span key={input} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                              {input}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Outputs</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedNode.data.outputs ?? []).map((output) => (
                            <span key={output} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                              {output}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Agent</p>
                      <span className="text-[11px] text-slate-500">{selectedAgent || "None"}</span>
                    </div>
                    <div className="grid gap-2">
                      {agentPresets.map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => updateSelectedNodeConfig("agent", agent.name)}
                          className={cn(
                            "rounded-[18px] border px-4 py-3 text-left transition",
                            selectedAgent === agent.name
                              ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.06]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{agent.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{agent.role}</p>
                            </div>
                            <span className="text-[11px] text-[#8b5cf6]">{agent.voice}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {selectedNode.data.category === "ai" ? (
                    <section className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">AI prompt</p>
                      <div className="space-y-3 rounded-[24px] border border-[#8b5cf6]/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.08),rgba(59,130,246,0.04),rgba(255,255,255,0.96))] p-4">
                        {Object.entries(selectedNode.data.config)
                          .filter(([key]) => ["prompt", "model", "temperature", "profileFocus"].includes(key))
                          .map(([key, value]) => (
                            <div key={key}>{renderConfigField(key, value)}</div>
                          ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Parameters</p>
                    <div className="space-y-3">
                      {Object.entries(selectedNode.data.config)
                        .filter(([key]) => !(selectedNode.data.category === "ai" && ["prompt", "model", "temperature", "profileFocus"].includes(key)))
                        .map(([key, value]) => (
                          <div key={key}>{renderConfigField(key, value)}</div>
                        ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preview</p>
                      <span className="text-[11px] text-slate-500">Flow</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Input", value: preview.input },
                        { label: "Transform", value: preview.transform },
                        { label: "Output", value: preview.output }
                      ].map((item) => (
                        <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                          <p className="mt-2 text-sm text-slate-600">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Logs</p>
                      <span className="text-[11px] text-slate-500">{currentRun ? currentRun.status : "Idle"}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedNodeLogs.length ? (
                        selectedNodeLogs.map((entry, index) => (
                          <div key={`${entry.timestamp ?? entry.message}-${index}`} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-900">{entry.message}</p>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.type}</span>
                            </div>
                            {entry.timestamp ? <p className="mt-1 text-xs text-slate-500">{entry.timestamp}</p> : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          No events yet.
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : activeSidebarSection === "workflows" ? (
                <section className="space-y-3">
                  {workflowSummaries.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/workflows/${workflow.id}`}
                      className={cn(
                        "block rounded-[20px] border px-4 py-3 transition",
                        workflow.id === workflowId
                          ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.06]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-950">{workflow.name}</p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{workflow.description}</p>
                    </Link>
                  ))}
                </section>
              ) : activeSidebarSection === "agents" ? (
                <section className="space-y-3">
                  {agentPresets.map((agent) => (
                    <div key={agent.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{agent.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{agent.role}</p>
                        </div>
                        <Bot className="h-4 w-4 text-[#8b5cf6]" />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{agent.behavior}</p>
                    </div>
                  ))}
                </section>
              ) : activeSidebarSection === "executions" ? (
                <section className="space-y-3">
                  {runSummaries.length ? (
                    runSummaries.map((run) => (
                      <Link
                        key={run.id}
                        href={`/runs/${run.id}`}
                        className="block rounded-[20px] border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-950">{run.label}</p>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{run.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{run.progress}% complete</p>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No runs yet.
                    </div>
                  )}
                </section>
              ) : activeSidebarSection === "templates" ? (
                <section className="space-y-3">
                  {builderTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateApply(template)}
                      className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/[0.06]"
                    >
                      <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{template.description}</p>
                      <p className="mt-2 text-[11px] text-[#8b5cf6]">{template.focus}</p>
                    </button>
                  ))}
                </section>
              ) : (
                <section className="space-y-3">
                  {settingsCards.map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {item.value}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{item.description}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>

      <CommandPalette
        open={isPaletteOpen}
        query={commandQuery}
        presets={filteredPresets.length ? filteredPresets : commandPresets}
        onQueryChange={setCommandQuery}
        onSelect={handleCommand}
        onClose={() => setIsPaletteOpen(false)}
      />
    </>
  );
}
