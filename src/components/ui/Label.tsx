import { cn } from "@/lib/utils";
import { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs uppercase tracking-[0.14em] text-muted mb-2", className)}
      {...props}
    />
  );
}
