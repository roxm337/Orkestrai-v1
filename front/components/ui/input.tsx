import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-none outline-none ring-0 transition placeholder:text-slate-400 focus:border-[#8b5cf6]/40 focus:bg-white",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
