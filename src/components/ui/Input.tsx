import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-11 rounded-md bg-[#0F0F0F] border border-border px-4 text-text",
        "placeholder:text-muted/70 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30",
        "transition-colors duration-200",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
