"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { WorkflowNodeData } from "@/types/workflow";

const accents: Record<string, string> = {
  scraper: "bg-amber-500",
  enrichment: "bg-emerald-500",
  analysis: "bg-sky-500",
  website_generator: "bg-rose-500"
};

export type WorkflowCanvasNode = Node<WorkflowNodeData>;

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const nodeType = String(data.type ?? "scraper");
  const accent = accents[nodeType] ?? "bg-slate-400";

  return (
    <div
      className={`min-w-[240px] rounded-2xl border bg-white px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition ${
        selected ? "border-sky-300 ring-2 ring-sky-500/10" : "border-slate-200"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {String(data.type).replaceAll("_", " ")}
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Step
          </span>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{String(data.label)}</h4>
          <p className="max-w-[220px] text-xs leading-5 text-slate-500">{String(data.description ?? "")}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-700" />
    </div>
  );
}
