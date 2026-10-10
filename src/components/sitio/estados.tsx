import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Container, EmptyState, Skeleton } from "@/components/ui/states";

export function NoEncontrado() {
  return (
    <Container className="py-16">
      <EmptyState
        icon={<SearchX aria-hidden />}
        title="No encontramos esta página"
        description="Puede que la propiedad ya no esté publicada o que el link tenga un error."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/alquiler" className={buttonStyles({ variant: "brand" })}>
              Ver alquileres
            </Link>
            <Link href="/venta" className={buttonStyles({ variant: "outline" })}>
              Ver ventas
            </Link>
          </div>
        }
      />
    </Container>
  );
}

export function ListadoCargando() {
  return (
    <Container className="min-h-dvh py-6 sm:py-8" aria-busy>
      <p className="sr-only" role="status">
        Cargando propiedades…
      </p>
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="mt-3 mb-6 h-5 w-32" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Container>
  );
}

export function FichaCargando() {
  return (
    <div className="min-h-dvh" aria-busy>
      <p className="sr-only" role="status">
        Cargando la propiedad…
      </p>
      <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-[21/9]" />
      <Container className="flex flex-col gap-4 py-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-14 w-full" />
      </Container>
    </div>
  );
}
