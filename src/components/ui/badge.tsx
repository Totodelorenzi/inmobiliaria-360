import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface text-fg",
  brand: "bg-brand text-brand-fg",
  accent: "bg-accent text-accent-fg",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  /** Sobre fotos. */
  overlay: "bg-black/70 text-white backdrop-blur-sm",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
