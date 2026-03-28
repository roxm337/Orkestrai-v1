import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-slate-200", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#3b82f6] to-[#22c55e] transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
