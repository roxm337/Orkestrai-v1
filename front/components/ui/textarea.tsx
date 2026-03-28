import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus:border-[#8b5cf6]/40 focus:bg-white",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
