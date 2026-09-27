import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8" aria-busy>
      <p className="sr-only" role="status">
        Cargando…
      </p>
      <Skeleton className="mb-6 h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}
