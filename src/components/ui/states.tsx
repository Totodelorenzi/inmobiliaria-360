import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloque gris animado para estados de carga. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-surface", className)} />;
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
};

/** Estado vacío o de error con un mensaje útil y, si corresponde, una acción. */
export function EmptyState({ icon, title, description, action, tone = "neutral", className }: EmptyStateProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-3 rounded-(--radius-card) border border-dashed px-6 py-10 text-center",
        tone === "danger" ? "border-danger/40 bg-danger-bg" : "border-border bg-surface",
        className,
      )}
    >
      {icon && (
        <div className={cn("[&_svg]:size-10", tone === "danger" ? "text-danger" : "text-muted")}>{icon}</div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <div className="max-w-md text-sm text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
