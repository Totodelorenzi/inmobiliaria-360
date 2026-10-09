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

async function cargar(params: Promise<{ sitio: string; slug: string }>) {
  const { sitio, slug } = await params;
  const agencia = await getAgencia(sitio);
  const datos = agencia ? await getPlanos(agencia.id, slug) : null;
  return agencia && datos && datos.planos.length > 0 ? { agencia, datos } : null;
}

export async function generateMetadata({ params }: PageProps<"/s/[sitio]/propiedad/[slug]/planos">): Promise<Metadata> {
  const cargado = await cargar(params);
  if (!cargado) return { title: "Planos no encontrados" };
  const { agencia, datos } = cargado;
  const titulo = `Planos · ${datos.titulo}`;
  const descripcion = `Planos de ${datos.titulo}: ${datos.planos.map((p) => p.nombre).join(", ")}.`;
  return {
    title: titulo,
    description: descripcion.slice(0, 160),
    ...metadataCompartir(agencia, datos.slug, titulo, descripcion, `/propiedad/${datos.slug}/planos`),
  };
}

export default async function PlanosPage({ params }: PageProps<"/s/[sitio]/propiedad/[slug]/planos">) {
  const cargado = await cargar(params);
  if (!cargado) notFound();
  const { datos } = cargado;
  return <VisorPlanos planos={datos.planos} titulo={datos.titulo} slug={datos.slug} tieneTour={datos.tieneTour} propertyId={datos.id} />;
}
