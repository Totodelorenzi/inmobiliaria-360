import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Encabezado } from "@/components/edificio/encabezado";
import { Planta, type UnidadPlanta } from "@/components/edificio/planta";
import { RastreoEdificio } from "@/components/edificio/rastreo";
import { getProyecto } from "@/lib/data/proyecto";
import { getAgencia } from "@/lib/data/sitio";
import { ESTADOS_UNIDAD, ESTADO_UNIDAD_COLOR, ESTADO_UNIDAD_LABEL, metrosUnidad, precioUnidad, rutaPiso, rutaProyecto, rutaUnidad } from "@/lib/edificio";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

type Ruta = PageProps<"/s/[sitio]/proyecto/[slug]/piso/[numero]">;

async function cargar(params: Ruta["params"]) {
  const { sitio, slug, numero } = await params;
  const agencia = await getAgencia(sitio);
  const proyecto = agencia ? await getProyecto(agencia.id, slug) : null;
  const piso = /^-?\d{1,3}$/.test(numero) ? proyecto?.pisos.find((p) => p.numero === Number(numero)) : undefined;
  return { proyecto, piso };
}

export async function generateMetadata({ params }: Ruta): Promise<Metadata> {
  const { proyecto, piso } = await cargar(params);
  if (!proyecto || !piso) return { title: "Piso no encontrado" };
  return { title: `${piso.nombre} · ${proyecto.nombre}`, description: `Unidades de ${piso.nombre.toLowerCase()} de ${proyecto.nombre}: disponibles, reservadas y vendidas.` };
}

export default async function PisoPage({ params }: Ruta) {
  const { proyecto, piso } = await cargar(params);
  if (!proyecto || !piso) notFound();

  const unidades = proyecto.unidades.filter((u) => u.floor_id === piso.id);
  const tocables = unidades.filter((u): u is typeof u & UnidadPlanta => u.poligono !== null);
  const planta = piso.planta_url && piso.planta_ancho && piso.planta_alto ? { url: piso.planta_url, ancho: piso.planta_ancho, alto: piso.planta_alto } : null;
  if (planta) preload(planta.url, { as: "image", fetchPriority: "high" });
  // De abajo hacia arriba, como se numeran.
  const pisos = [...proyecto.pisos].sort((a, b) => a.numero - b.numero);

  return (
    <>
      <RastreoEdificio tipo="floor_view" projectId={proyecto.id} floorId={piso.id} />
      <Encabezado titulo={piso.nombre} detalle={proyecto.nombre} volver={{ href: rutaProyecto(proyecto.slug), texto: "Fachada" }} />
      <nav aria-label="Pisos" className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2">
        {pisos.map((p) => (
          <Link
            key={p.id}
            href={rutaPiso(proyecto.slug, p.numero)}
            aria-current={p.id === piso.id ? "page" : undefined}
            className="flex min-h-11 shrink-0 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-surface aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-brand-fg"
          >
            {p.nombre}
          </Link>
        ))}
      </nav>
      {planta && (
        <div className="bg-surface py-2">
          <Planta slug={proyecto.slug} nombre={piso.nombre} imagen={planta} unidades={tocables.map(({ codigo, estado, poligono }) => ({ codigo, estado, poligono }))} />
        </div>
      )}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Referencias">
          {ESTADOS_UNIDAD.map((estado) => (
            <li key={estado} className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: ESTADO_UNIDAD_COLOR[estado] }} aria-hidden /> {ESTADO_UNIDAD_LABEL[estado]}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2">
          {unidades.map((u) => {
            const tipologia = proyecto.tipologias.find((t) => t.id === u.unit_type_id);
            return (
              <li key={u.id}>
                <Link href={rutaUnidad(proyecto.slug, u.codigo)} className={cn("flex min-h-14 items-center gap-3 rounded-(--radius-card) border border-border bg-bg px-3 hover:bg-surface", u.estado === "vendida" && "opacity-70")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: ESTADO_UNIDAD_COLOR[u.estado] }}>
                    {u.codigo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{[tipologia?.nombre, metrosUnidad(u)].filter(Boolean).join(" · ")}</span>
                    <span className="block text-sm text-muted">{ESTADO_UNIDAD_LABEL[u.estado]}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{u.estado === "vendida" ? "" : precioUnidad(u)}</span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
