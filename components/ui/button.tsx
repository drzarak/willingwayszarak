"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-card hover:-translate-y-0.5 hover:bg-[#0b61e0]",
        accent:
          "bg-accent text-accent-foreground shadow-card hover:-translate-y-0.5 hover:bg-[#10a294]",
        secondary:
          "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800",
        outline:
          "border border-slate-200 bg-white/80 text-slate-700 hover:border-primary/30 hover:bg-white",
        ghost: "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950",
        surface:
          "border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:bg-white",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 py-2 text-xs",
        lg: "h-12 px-6 py-3",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

