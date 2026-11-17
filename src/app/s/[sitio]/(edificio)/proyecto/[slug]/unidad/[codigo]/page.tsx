import { Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Encabezado } from "@/components/edificio/encabezado";
import { PedirInfo } from "@/components/edificio/pedir-info";
import { RastreoEdificio } from "@/components/edificio/rastreo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { buscarUnidad, getProyecto } from "@/lib/data/proyecto";
import { getAgencia } from "@/lib/data/sitio";
import { ESTADO_UNIDAD_LABEL, precioUnidad, rutaAmbientes, rutaPiso } from "@/lib/edificio";
import { formatM2 } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

type Ruta = PageProps<"/s/[sitio]/proyecto/[slug]/unidad/[codigo]">;

async function cargar(params: Ruta["params"]) {
  const { sitio, slug, codigo } = await params;
  const agencia = await getAgencia(sitio);
  const proyecto = agencia ? await getProyecto(agencia.id, slug) : null;
  return { agencia, proyecto, encontrada: proyecto ? buscarUnidad(proyecto, codigo) : null };
}

export async function generateMetadata({ params }: Ruta): Promise<Metadata> {
  const { proyecto, encontrada } = await cargar(params);
  if (!proyecto || !encontrada) return { title: "Unidad no encontrada" };
  const { unidad, tipologia } = encontrada;
  return {
    title: `Unidad ${unidad.codigo} · ${proyecto.nombre}`,
    description: `${tipologia.nombre} en ${proyecto.nombre}${formatM2(unidad.superficie_cubierta) ? `, ${formatM2(unidad.superficie_cubierta)} cubiertos` : ""}. ${ESTADO_UNIDAD_LABEL[unidad.estado]}.`,
  };
}

export default async function UnidadPage({ params }: Ruta) {
  const { agencia, proyecto, encontrada } = await cargar(params);
  if (!agencia || !proyecto || !encontrada) notFound();
  const { unidad, piso, tipologia } = encontrada;

  const maqueta = tipologia.maqueta_url && tipologia.maqueta_ancho && tipologia.maqueta_alto ? { url: tipologia.maqueta_url, ancho: tipologia.maqueta_ancho, alto: tipologia.maqueta_alto } : null;
  if (maqueta) preload(maqueta.url, { as: "image", fetchPriority: "high" });

  const ficha: [string, string | null][] = [
    ["Superficie cubierta", formatM2(unidad.superficie_cubierta)],
    ["Superficie total", formatM2(unidad.superficie_total)],
    ["Ambientes", tipologia.ambientes ? String(tipologia.ambientes) : null],
    ["Dormitorios", tipologia.dormitorios ? String(tipologia.dormitorios) : null],
    ["Baños", tipologia.banos ? String(tipologia.banos) : null],
    ["Orientación", unidad.orientacion],
    ["Piso", piso.nombre.replace(/^piso\s+/i, "")],
  ];

  return (
    <>
      <RastreoEdificio tipo="unit_view" projectId={proyecto.id} floorId={piso.id} unitId={unidad.id} />
      <Encabezado titulo={`Unidad ${unidad.codigo}`} detalle={proyecto.nombre} volver={{ href: rutaPiso(proyecto.slug, piso.numero), texto: piso.nombre }} />
      {maqueta && (
        <div className="bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya optimizada, con su lugar reservado */}
          <img
            src={maqueta.url}
            width={maqueta.ancho}
            height={maqueta.alto}
            alt={`Maqueta de la unidad ${unidad.codigo} vista desde arriba`}
            fetchPriority="high"
            decoding="async"
            // Unidad espejada: se muestra la maqueta de su tipología dada vuelta.
            className={cn("mx-auto block h-auto max-h-[55dvh] w-auto max-w-full", unidad.espejada && "-scale-x-100")}
          />
        </div>
      )}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xl leading-tight font-bold">
              {tipologia.nombre} · {unidad.codigo}
            </p>
            <p className="mt-1 text-xl font-bold text-brand-ink">{precioUnidad(unidad)}</p>
          </div>
          <Badge tone={unidad.estado} className="mt-1 shrink-0 px-3 py-1.5 text-sm">
            {ESTADO_UNIDAD_LABEL[unidad.estado]}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-(--radius-card) border border-border p-4 sm:grid-cols-3">
          {ficha
            .filter(([, valor]) => valor)
            .map(([label, valor]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
        </dl>

        <div className="flex flex-col gap-3">
          {tipologia.renders.length > 0 && (
            <Link href={rutaAmbientes(proyecto.slug, unidad.codigo)} className={buttonStyles({ variant: "accent", size: "lg", fullWidth: true })}>
              <Images className="size-5" aria-hidden /> Ver ambientes
            </Link>
          )}
          <PedirInfo agencyId={agencia.id} unitId={unidad.id} codigo={unidad.codigo} proyecto={proyecto.nombre} />
        </div>
        {unidad.estado !== "disponible" && (
          <p className="text-sm text-muted">
            Esta unidad está {ESTADO_UNIDAD_LABEL[unidad.estado].toLowerCase()}. Pedí información y te contamos qué unidades parecidas quedan disponibles.
          </p>
        )}
      </div>
    </>
  );
}
