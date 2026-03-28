"use client";

import { Bot, BrainCircuit, Database, GitBranch, RadioTower, Sparkles } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { NodeCategory, NodeRuntime, WorkflowNodeData } from "@/types/workflow";

type WorkflowNodeVisualData = WorkflowNodeData & {
  isActive?: boolean;
};

const categoryCopy: Record<NodeCategory, { label: string; icon: typeof Sparkles }> = {
  trigger: { label: "Trigger", icon: RadioTower },
  action: { label: "Action", icon: Bot },
  ai: { label: "AI", icon: BrainCircuit },
  logic: { label: "Logic", icon: GitBranch },
  data: { label: "Data", icon: Database }
};

const runtimeCopy: Record<NodeRuntime, string> = {
  ready: "Local agent ready",
  design: "Design mode"
};

export type WorkflowCanvasNode = Node<WorkflowNodeVisualData>;

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const category = data.category ?? "action";
  const runtime = data.runtime ?? "design";
  const accent = data.accent ?? "#7c3aed";
  const CategoryIcon = categoryCopy[category].icon;
  const active = Boolean(data.isActive);

  return (
    <div
      className={`group relative min-w-[292px] rounded-[24px] border px-4 py-4 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.12)] transition duration-300 ${
        selected
          ? "border-[#8b5cf6]/28 bg-white ring-1 ring-[#8b5cf6]/18"
          : "border-slate-200 bg-white/96 hover:border-slate-300 hover:bg-white"
      } ${active ? "workflow-node-active" : ""}`}
      style={{
        boxShadow: active
          ? `0 0 0 1px ${accent}30, 0 22px 64px rgba(15, 23, 42, 0.16), 0 0 32px ${accent}12`
          : undefined
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)` }}
      />
      <Handle type="target" position={Position.Left} className="!h-3.5 !w-3.5 !border-2 !border-white !bg-slate-700" />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
              style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
            >
              <CategoryIcon className="h-4 w-4" style={{ color: accent }} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{categoryCopy[category].label}</p>
              <p className="text-sm font-semibold text-slate-950">{String(data.label)}</p>
            </div>
          </div>
          <span
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              borderColor: runtime === "ready" ? "rgba(34,197,94,0.22)" : "rgba(148,163,184,0.32)",
              color: runtime === "ready" ? "#15803d" : "#64748b",
              backgroundColor: runtime === "ready" ? "rgba(34,197,94,0.08)" : "rgba(241,245,249,0.88)"
            }}
          >
            {runtime === "ready" ? "Ready" : "Design"}
          </span>
        </div>

        <p className="max-w-[240px] text-sm leading-6 text-slate-500">{String(data.description ?? "")}</p>

        <div className="grid gap-2">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inputs</p>
            <p className="mt-1 text-xs text-slate-600">{(data.inputs ?? []).join(" • ") || "No inputs"}</p>
          </div>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Outputs</p>
            <p className="mt-1 text-xs text-slate-600">{(data.outputs ?? []).join(" • ") || "No outputs"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{runtimeCopy[runtime]}</span>
          <span>{String(data.type).replaceAll("_", " ")}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!h-3.5 !w-3.5 !border-2 !border-white !bg-slate-700" />
    </div>
  );
}
