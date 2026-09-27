import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-(--radius-card) border border-border bg-bg shadow-(--shadow-card)", className)}
      {...props}
    />
  );
}
