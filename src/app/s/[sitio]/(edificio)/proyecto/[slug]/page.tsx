import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Encabezado } from "@/components/edificio/encabezado";
import { Fachada, type PisoFachada } from "@/components/edificio/fachada";
import { getProyecto } from "@/lib/data/proyecto";
import { getAgencia } from "@/lib/data/sitio";
import { rutaPiso, rutaProyecto } from "@/lib/edificio";
import { plural } from "@/lib/format";
import { urlEnSitio } from "@/lib/tenancy";

export const revalidate = 3600;

// Se genera al primer pedido y queda cacheada (ISR); el panel la invalida al cambiar algo.
export function generateStaticParams() {
  return [];
}

async function cargar(params: Promise<{ sitio: string; slug: string }>) {
  const { sitio, slug } = await params;
  const agencia = await getAgencia(sitio);
  return { agencia, proyecto: agencia ? await getProyecto(agencia.id, slug) : null };
}

export async function generateMetadata({ params }: PageProps<"/s/[sitio]/proyecto/[slug]">): Promise<Metadata> {
  const { agencia, proyecto } = await cargar(params);
  if (!agencia || !proyecto) return { title: "Proyecto no encontrado" };
  const titulo = [proyecto.nombre, proyecto.ciudad].filter(Boolean).join(" · ");
  const descripcion = (proyecto.descripcion ?? `Conocé ${proyecto.nombre}: elegí un piso, mirá cada unidad y recorré sus ambientes.`).slice(0, 160);
  const url = urlEnSitio(agencia, rutaProyecto(proyecto.slug));
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: titulo, description: descripcion, ...(proyecto.fachada_url && { images: [proyecto.fachada_url] }) },
  };
}

export default async function ProyectoPage({ params }: PageProps<"/s/[sitio]/proyecto/[slug]">) {
  const { agencia, proyecto } = await cargar(params);
  if (!agencia || !proyecto) notFound();

  const pisos = proyecto.pisos.map((p) => {
    const unidades = proyecto.unidades.filter((u) => u.floor_id === p.id);
    return { ...p, total: unidades.length, disponibles: unidades.filter((u) => u.estado === "disponible").length };
  });
  const tocables = pisos.filter((p): p is typeof p & PisoFachada => p.poligono !== null);
  const fachada = proyecto.fachada_url && proyecto.fachada_ancho && proyecto.fachada_alto ? { url: proyecto.fachada_url, ancho: proyecto.fachada_ancho, alto: proyecto.fachada_alto } : null;
  // La fachada es lo primero que se ve: se pide desde el <head>.
  if (fachada) preload(fachada.url, { as: "image", fetchPriority: "high" });
  const disponibles = pisos.reduce((total, p) => total + p.disponibles, 0);

  return (
    <>
      <Encabezado titulo={proyecto.nombre} detalle={[agencia.nombre, proyecto.ciudad].filter(Boolean).join(" · ")} />
      {fachada && (
        <div className="bg-surface">
          <Fachada slug={proyecto.slug} nombre={proyecto.nombre} imagen={fachada} pisos={tocables.map(({ numero, nombre, poligono, disponibles: d }) => ({ numero, nombre, poligono, disponibles: d }))} />
        </div>
      )}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        <div>
          <p className="text-lg font-bold">Elegí un piso</p>
          <p className="text-sm text-muted">
            {tocables.length > 0 && "Tocalo en la imagen o en la lista. "}
            {disponibles > 0 ? `${plural(disponibles, "unidad disponible", "unidades disponibles")}.` : "Consultá por la disponibilidad."}
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {pisos.map((p) => (
            <li key={p.id}>
              <Link href={rutaPiso(proyecto.slug, p.numero)} className="flex min-h-14 items-center gap-3 rounded-(--radius-card) border border-border bg-bg px-4 hover:bg-surface">
                <span className="flex-1 font-semibold">{p.nombre}</span>
                <span className="text-sm text-muted">
                  {p.disponibles > 0 ? `${p.disponibles} de ${p.total} ${p.disponibles === 1 ? "disponible" : "disponibles"}` : "Sin disponibles"}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        {proyecto.descripcion && <p className="text-pretty">{proyecto.descripcion}</p>}
        {proyecto.direccion && (
          <p className="text-sm text-muted">
            {proyecto.direccion}
            {proyecto.ciudad && `, ${proyecto.ciudad}`}
          </p>
        )}
      </div>
    </>
  );
}
