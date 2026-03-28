"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Play, Plus, Save } from "lucide-react";

import { createRun, createWorkflow, updateWorkflow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowNodeCard, type WorkflowCanvasNode } from "@/components/workflow/custom-node";
import type { NodeCatalogItem, WorkflowPayload, WorkflowRecord } from "@/types/workflow";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
  workflowNode: WorkflowNodeCard
};

type BuilderProps = {
  initialWorkflow: WorkflowRecord | null;
  nodeCatalog: NodeCatalogItem[];
  seedWorkflow: WorkflowPayload;
};

function buildNode(nodeCatalog: NodeCatalogItem[], type: NodeCatalogItem["type"], index: number): WorkflowCanvasNode {
  const template = nodeCatalog.find((item) => item.type === type);
  if (!template) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id: `${type}-${crypto.randomUUID()}`,
    type: "workflowNode",
    position: { x: 80 + index * 220, y: 120 + (index % 2) * 80 },
    data: {
      type: template.type,
      label: template.label,
      description: template.description,
      config: { ...template.defaultConfig }
    }
  };
}

export function WorkflowBuilder({ initialWorkflow, nodeCatalog, seedWorkflow }: BuilderProps) {
  const source = initialWorkflow ?? {
    id: "",
    ...seedWorkflow,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const [workflowId, setWorkflowId] = useState(initialWorkflow?.id ?? "");
  const [name, setName] = useState(source.name);
  const [description, setDescription] = useState(source.description);
  const [nodes, setNodes, onNodesChange] = useNodesState(source.definition.nodes as WorkflowCanvasNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(source.definition.edges as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(source.definition.nodes[0]?.id ?? null);
  const [notice, setNotice] = useState("Ready to shape your local workflow.");
  const [isPending, startTransition] = useTransition();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  function handleConnect(connection: Connection) {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          id: crypto.randomUUID()
        },
        current
      )
    );
  }

  function handleAddNode(type: NodeCatalogItem["type"]) {
    const node = buildNode(nodeCatalog, type, nodes.length);
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
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

  function updateSelectedNodeConfig(key: string, value: boolean | number | string) {
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
                  ...(node.data.config as Record<string, boolean | number | string>),
                  [key]: value
                }
              }
            }
          : node
      )
    );
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
            config: node.data.config
          }
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target
        })),
        viewport: seedWorkflow.definition.viewport
      }
    };
  }

  async function persistWorkflow() {
    const payload = createPayload();
    const saved = workflowId ? await updateWorkflow(workflowId, payload) : await createWorkflow(payload);
    setWorkflowId(saved.id);
    setNotice("Workflow saved locally.");
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
    startTransition(() => {
      void (async () => {
        try {
          const workflow = await persistWorkflow();
          const run = await createRun(workflow.id);
          setNotice(`Run queued. Open /runs/${run.id} to watch it execute.`);
          window.location.href = `/runs/${run.id}`;
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Failed to queue run.");
        }
      })();
    });
  }

  return (
    <div className={`grid gap-4 ${isFullscreen ? "fixed inset-0 z-50 bg-[#f6f8fb] p-4" : "xl:grid-cols-[260px,minmax(0,1fr),320px]"}`}>
      {isLibraryOpen && (
        <Card className={`h-fit ${isFullscreen ? "max-h-[calc(100vh-2rem)] overflow-auto" : "sticky top-24"}`}>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Library</CardTitle>
                <CardDescription>Add steps fast, then refine them in the inspector.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsLibraryOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Workflow name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Lead Generation + Website" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a short purpose so the workflow stays easy to scan."
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Node library</p>
              {nodeCatalog.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddNode(item.type)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{notice}</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSave} disabled={isPending} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="accent" onClick={handleRun} disabled={isPending} className="flex-1">
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={`overflow-hidden p-0 ${isFullscreen ? "h-full" : "min-h-[760px]"}`}>
        <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Builder</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                {name || "Untitled workflow"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!isLibraryOpen && (
                <Button variant="ghost" size="sm" onClick={() => setIsLibraryOpen(true)}>
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
              {!isInspectorOpen && (
                <Button variant="ghost" size="sm" onClick={() => setIsInspectorOpen(true)}>
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen((current) => !current)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              {nodes.length} nodes
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              {edges.length} connections
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              {selectedNode ? `Editing ${String(selectedNode.data.label)}` : "No node selected"}
            </span>
          </div>
        </div>
        <div className="relative h-[680px]">
          {nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto w-fit rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Start with a node from the left rail</p>
              <p className="mt-1 text-xs text-slate-500">The canvas stays clean until you add the first workflow step.</p>
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <Background color="#d7dee7" gap={24} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
      </Card>

      {isInspectorOpen && (
        <Card className={`h-fit ${isFullscreen ? "max-h-[calc(100vh-2rem)] overflow-auto" : "sticky top-24"}`}>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Inspector</CardTitle>
                <CardDescription>Direct access to the selected node without leaving the builder.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsInspectorOpen(false)}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNode ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Selected node</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{String(selectedNode.data.label)}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{String(selectedNode.data.description ?? "")}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Label</label>
                  <Input
                    value={String(selectedNode.data.label ?? "")}
                    onChange={(event) => updateSelectedNode("label", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</label>
                  <Textarea
                    value={String(selectedNode.data.description ?? "")}
                    onChange={(event) => updateSelectedNode("description", event.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Configuration</p>
                  {Object.entries(selectedNode.data.config as Record<string, boolean | number | string>).map(([key, value]) => {
                    if (typeof value === "boolean") {
                      return (
                        <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                          <span className="text-sm font-medium text-slate-700">{key}</span>
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(event) => updateSelectedNodeConfig(key, event.target.checked)}
                            className="h-4 w-4 accent-[#2563eb]"
                          />
                        </label>
                      );
                    }

                    return (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium capitalize text-slate-700">{key}</label>
                        <Input
                          type={typeof value === "number" ? "number" : "text"}
                          value={String(value)}
                          onChange={(event) =>
                            updateSelectedNodeConfig(
                              key,
                              typeof value === "number" ? Number(event.target.value) : event.target.value
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                Select a node on the canvas to edit its properties here.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
