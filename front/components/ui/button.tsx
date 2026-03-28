"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
        secondary: "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        accent:
          "bg-[linear-gradient(135deg,rgba(124,58,237,0.96),rgba(59,130,246,0.86))] text-white shadow-[0_12px_32px_rgba(124,58,237,0.28)] hover:scale-[1.01] hover:shadow-[0_18px_36px_rgba(124,58,237,0.34)]"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
