import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisorTour } from "@/components/visor/visor-tour";
import { getAgencia, getTour } from "@/lib/data/sitio";
import { formatPrecio } from "@/lib/format";
import { metadataCompartir } from "@/lib/og";
import { urlEnSitio } from "@/lib/tenancy";

export const revalidate = 3600;

// Se generan al primer pedido y quedan cacheadas (ISR).
export function generateStaticParams() {
  return [];
}

async function cargar(params: Promise<{ sitio: string; slug: string }>) {
  const { sitio, slug } = await params;
  const agencia = await getAgencia(sitio);
  const tour = agencia ? await getTour(agencia.id, slug) : null;
  return { agencia, tour: tour && tour.escenas.length > 0 ? tour : null };
}

export async function generateMetadata({ params }: PageProps<"/s/[sitio]/propiedad/[slug]/tour">): Promise<Metadata> {
  const { agencia, tour } = await cargar(params);
  if (!agencia || !tour) return { title: "Tour no encontrado" };
  const titulo = `Tour 360° · ${tour.titulo}`;
  const descripcion = `Recorré ${tour.titulo} en 360°: ${tour.escenas.map((e) => e.nombre_ambiente).join(", ")}.`;
  return {
    title: titulo,
    description: descripcion.slice(0, 160),
    ...metadataCompartir(agencia, tour.slug, titulo, descripcion, `/propiedad/${tour.slug}/tour`),
  };
}

export default async function TourPage({ params }: PageProps<"/s/[sitio]/propiedad/[slug]/tour">) {
  const { agencia, tour } = await cargar(params);
  if (!agencia || !tour) notFound();
  const mensaje = `¡Hola! Estoy viendo el tour 360° de "${tour.titulo}" (${formatPrecio(tour.precio, tour.moneda, tour.operacion)}). ${urlEnSitio(agencia, `/propiedad/${tour.slug}`)}`;
  return (
    <VisorTour
      escenas={tour.escenas}
      titulo={tour.titulo}
      slug={tour.slug}
      tienePlanos={tour.tienePlanos}
      propertyId={tour.id}
      operacion={tour.operacion}
      whatsapp={agencia.whatsapp ? { numero: agencia.whatsapp, mensaje } : null}
    />
  );
}
