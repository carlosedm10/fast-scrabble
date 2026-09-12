import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-white/12 bg-[#080d18cc] px-3 py-2 text-sm text-white shadow-inner shadow-black/20 placeholder:text-white/35 focus-visible:border-brand-cyan/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/35",
        className,
      )}
      {...props}
    />
  );
}
