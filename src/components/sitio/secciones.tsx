import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/states";
import type { PropiedadTarjeta } from "@/lib/data/sitio";
import { PropertyCard } from "./property-card";

/** Fila de tarjetas: carrusel con swipe en el celular, grilla en pantallas grandes. */
export function SeccionPropiedades({
  titulo,
  items,
  verTodas,
  total,
  prioridad = false,
}: {
  titulo: string;
  items: PropiedadTarjeta[];
  verTodas: string;
  total: number;
  prioridad?: boolean;
}) {
  const id = useId();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="py-8">
      <Container>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id={id} className="text-2xl font-bold sm:text-3xl">
            {titulo}
          </h2>
          <Link href={verTodas} className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-brand-ink hover:underline">
            Ver todas{total > items.length ? ` (${total})` : ""} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {items.map((p, i) => (
            <li key={p.id} className="w-[85%] shrink-0 snap-start sm:w-[45%] md:w-auto">
              <PropertyCard p={p} prioridad={prioridad && i === 0} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Grilla de resultados de un listado. */
export function GrillaPropiedades({ items }: { items: PropiedadTarjeta[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p, i) => (
        <li key={p.id}>
          <PropertyCard p={p} prioridad={i < 2} />
        </li>
      ))}
    </ul>
  );
}

/** Buscador del inicio. Funciona sin JavaScript: /buscar redirige al listado que corresponde. */
export function Buscador({ total }: { total: { alquiler: number; venta: number } }) {
  const operacionInicial = total.alquiler >= total.venta ? "alquiler" : "venta";
  return (
    <form action="/buscar" method="get" role="search" className="mt-6 flex max-w-2xl flex-col gap-3">
      <fieldset className="grid grid-cols-2 gap-1 rounded-2xl bg-black/20 p-1">
        <legend className="sr-only">¿Qué buscás?</legend>
        {(["alquiler", "venta"] as const).map((op) => (
          <label
            key={op}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition has-checked:bg-bg has-checked:text-fg has-focus-visible:outline-3 has-focus-visible:outline-accent"
          >
            <input type="radio" name="operacion" value={op} defaultChecked={op === operacionInicial} className="sr-only" />
            {op === "alquiler" ? "Alquiler" : "Venta"}
            <span className="rounded-full bg-current/15 px-2 py-0.5 text-xs">{total[op]}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Barrio, calle o tipo de propiedad</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder="Barrio, calle o tipo"
            autoComplete="off"
            className="h-12 w-full rounded-xl border-0 bg-bg pr-3 pl-10 text-base text-fg placeholder:text-muted"
          />
        </label>
        <button type="submit" className={buttonStyles({ variant: "accent", className: "h-12" })}>
          Buscar
        </button>
      </div>
    </form>
  );
}

/** Selector fijo Alquiler/Venta con contador (abajo, en el celular). */
export function BarraOperaciones({ total }: { total: { alquiler: number; venta: number } }) {
  return (
    <nav
      aria-label="Ver propiedades por operación"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-2 gap-2">
        {(["alquiler", "venta"] as const).map((op) => (
          <Link key={op} href={`/${op}`} className={buttonStyles({ variant: "brand", fullWidth: true })}>
            {op === "alquiler" ? "Alquiler" : "Venta"}
            <span className="rounded-full bg-current/20 px-2 py-0.5 text-xs">{total[op]}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Se muestra mientras Supabase no esté configurado o no haya inmobiliaria cargada. */
