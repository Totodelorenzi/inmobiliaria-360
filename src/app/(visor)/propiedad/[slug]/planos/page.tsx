import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisorPlanos } from "@/components/visor/visor-planos";
import { getAgencia, getPlanos } from "@/lib/data/sitio";
import { metadataCompartir } from "@/lib/og";

export const revalidate = 3600;

// Se generan al primer pedido y quedan cacheadas (ISR).
export function generateStaticParams() {
  return [];
}

async function cargar(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const agencia = await getAgencia();
  const datos = agencia ? await getPlanos(agencia.id, slug) : null;
  return datos && datos.planos.length > 0 ? datos : null;
}

export async function generateMetadata({ params }: PageProps<"/propiedad/[slug]/planos">): Promise<Metadata> {
  const datos = await cargar(params);
  if (!datos) return { title: "Planos no encontrados" };
  const titulo = `Planos · ${datos.titulo}`;
  const descripcion = `Planos de ${datos.titulo}: ${datos.planos.map((p) => p.nombre).join(", ")}.`;
  return {
    title: titulo,
    description: descripcion.slice(0, 160),
    alternates: { canonical: `/propiedad/${datos.slug}/planos` },
    ...metadataCompartir(datos.slug, titulo, descripcion, `/propiedad/${datos.slug}/planos`),
  };
}

export default async function PlanosPage({ params }: PageProps<"/propiedad/[slug]/planos">) {
  const datos = await cargar(params);
  if (!datos) notFound();
  return <VisorPlanos planos={datos.planos} titulo={datos.titulo} slug={datos.slug} tieneTour={datos.tieneTour} propertyId={datos.id} />;
}
