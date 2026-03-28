import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-3xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-ember/40",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
