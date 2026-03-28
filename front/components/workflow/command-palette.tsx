"use client";

import { Command, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { CommandPreset } from "@/components/workflow/builder-data";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  open: boolean;
  query: string;
  presets: CommandPreset[];
  onQueryChange: (value: string) => void;
  onSelect: (preset: CommandPreset) => void;
  onClose: () => void;
};

export function CommandPalette({ open, query, presets, onQueryChange, onSelect, onClose }: CommandPaletteProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/20 px-4 pt-24 backdrop-blur-xl" onClick={onClose}>
      <div
        className="workflow-panel w-full max-w-2xl overflow-hidden border-slate-200 bg-white/98 shadow-[0_28px_100px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
            AI commands
          </div>
          <div className="relative">
            <Command className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Create lead gen workflow, add WhatsApp node, generate pipeline..."
              className="h-14 rounded-[20px] border-slate-200 bg-slate-50 pl-11 text-base"
            />
          </div>
        </div>

        <div className="space-y-2 p-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className={cn(
                "w-full rounded-[20px] border border-transparent px-4 py-4 text-left transition duration-200",
                "bg-slate-50 hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/[0.06] hover:shadow-[0_0_0_1px_rgba(124,58,237,0.14)]"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{preset.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{preset.description}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {preset.action}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
