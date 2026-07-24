import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/80 backdrop-blur-none",
        className,
      )}
      {...props}
    />
  );
}
