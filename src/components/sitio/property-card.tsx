import { DraftingCompass, HardHat, House, MapPin, Rotate3d } from "lucide-react";
import Link from "next/link";
import { preload } from "react-dom";
import { Badge } from "@/components/ui/badge";
import type { PropiedadTarjeta } from "@/lib/data/sitio";
import { badgeObra, formatExpensas, formatM2, formatPrecio, formatUbicacion, OPERACION_LABEL, plural } from "@/lib/format";

export function PropertyCard({ p, prioridad = false }: { p: PropiedadTarjeta; prioridad?: boolean }) {
  const obra = badgeObra(p.estado_obra, p.fecha_entrega);
  const expensas = formatExpensas(p.expensas);
  const chips = [
    p.ambientes && plural(p.ambientes, "amb.", "amb."),
    p.dormitorios && plural(p.dormitorios, "dorm.", "dorm."),
    p.banos && plural(p.banos, "baño"),
    formatM2(p.superficie_total),
  ].filter(Boolean) as string[];

  // La primera tarjeta suele ser el LCP del inicio: se pide desde el <head>, antes de leer el cuerpo.
  if (prioridad && p.foto) preload(p.foto.thumb_url ?? p.foto.url, { as: "image", fetchPriority: "high" });

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-(--radius-card) border border-border bg-bg shadow-(--shadow-card) transition hover:shadow-lg has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura ya optimizada al subirla (ver DECISIONES)
          <img
            src={p.foto.thumb_url ?? p.foto.url}
            alt=""
            width={800}
            height={600}
            loading={prioridad ? "eager" : "lazy"}
            fetchPriority={prioridad ? "high" : undefined}
            decoding="async"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <House className="size-12" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="overlay">{OPERACION_LABEL[p.operacion]}</Badge>
          {p.tieneTour && (
            <Badge tone="accent">
              <Rotate3d aria-hidden /> Tour 360°
            </Badge>
          )}
          {p.tienePlanos && (
            <Badge tone="accent">
              <DraftingCompass aria-hidden /> Planos
            </Badge>
          )}
        </div>
        {obra && (
          <Badge tone="overlay" className="absolute bottom-3 left-3">
            <HardHat aria-hidden /> {obra}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-display text-xl font-bold">{formatPrecio(p.precio, p.moneda, p.operacion)}</p>
        {expensas && <p className="text-sm text-muted">+ {expensas} expensas</p>}
        <h3 className="mt-1 line-clamp-2 font-semibold">
          <Link href={`/propiedad/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.titulo}
          </Link>
        </h3>
        <p className="flex items-start gap-1 text-sm text-muted">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {formatUbicacion(p)}
        </p>
        {chips.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3" aria-label="Características">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium">
                {chip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
