import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b14] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-brand-cyan-light/40 bg-brand-cyan text-[#05070d] shadow-[0_6px_18px_rgba(4,158,226,0.2)] hover:-translate-y-0.5 hover:bg-brand-cyan-light",
        outline: "border border-brand-cyan/35 bg-[#10182899] text-white backdrop-blur-md hover:border-brand-cyan-light/60 hover:bg-[#16263d]",
        ghost: "text-white/70 hover:bg-white/7 hover:text-white",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
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

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
