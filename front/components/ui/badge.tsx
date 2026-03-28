import { cn } from "@/lib/utils";

const tones = {
  queued: "border border-amber-400/20 bg-amber-400/10 text-amber-700",
  running: "border border-sky-400/20 bg-sky-400/10 text-sky-700",
  completed: "border border-emerald-400/20 bg-emerald-400/10 text-emerald-700",
  failed: "border border-rose-400/20 bg-rose-400/10 text-rose-700",
  default: "border border-slate-200 bg-slate-100 text-slate-600"
};

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
