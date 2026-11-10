import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisorTour } from "@/components/visor/visor-tour";
import { getAgencia, getTour } from "@/lib/data/sitio";
import { mensajeWhatsapp } from "@/lib/format";
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
  // Con el switch del 360 apagado, el tour no existe para el público.
  return { agencia, tour: agencia?.recorrido_activo && tour && tour.escenas.length > 0 ? tour : null };
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
  const numero = tour.asesor?.whatsapp ?? agencia.whatsapp;
  // {ambiente} lo completa el visor con el ambiente que se está mirando.
  const datos = {
    asesor: tour.asesor?.whatsapp ? tour.asesor.nombre : null,
    tipo: tour.tipo,
    barrio: tour.barrio,
    inmobiliaria: agencia.nombre,
    accion: "saber más (estoy mirando: {ambiente})",
    url: urlEnSitio(agencia, `/propiedad/${tour.slug}`),
  };
  const mensaje = mensajeWhatsapp(datos);
  const mensajeRecorrido = mensajeWhatsapp({ ...datos, yaRecorrio: true });
  return (
    <VisorTour
      escenas={tour.escenas}
      titulo={tour.titulo}
      slug={tour.slug}
      tienePlanos={tour.tienePlanos}
      propertyId={tour.id}
      operacion={tour.operacion}
      whatsapp={numero ? { numero, mensaje, mensajeRecorrido } : null}
    />
  );
}
