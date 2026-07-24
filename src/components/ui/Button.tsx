import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[#d4af37] text-[#0a0a0a] hover:bg-[#e0c04a] font-semibold tracking-wide shadow-[0_0_24px_rgba(212,175,55,0.18)]",
  secondary:
    "bg-[#1a1a1a] text-white border border-white/12 hover:border-[#d4af37]/40 hover:text-[#e8c56a] hover:bg-[#1f1f1f]",
  ghost: "bg-transparent text-muted hover:text-[#e8c56a] hover:bg-[#d4af37]/8",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
