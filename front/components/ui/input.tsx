import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm text-ink shadow-sm outline-none ring-0 transition focus:border-ember/40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
