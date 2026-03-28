import { cn } from "@/lib/utils";

const tones = {
  queued: "bg-amber-100 text-amber-900",
  running: "bg-sky-100 text-sky-900",
  completed: "bg-emerald-100 text-emerald-900",
  failed: "bg-rose-100 text-rose-900",
  default: "bg-stone-100 text-stone-700"
};

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
