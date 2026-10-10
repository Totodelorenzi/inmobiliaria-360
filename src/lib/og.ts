import type { Metadata } from "next";
import { urlEnSitio } from "@/lib/tenancy";

export const OG_SIZE = { width: 1200, height: 630 };

type DominiosAgencia = Parameters<typeof urlEnSitio>[0];

/**
 * Open Graph + Twitter con la imagen de la propiedad (/og/propiedad/[slug]). URLs absolutas con el
 * dominio de la inmobiliaria: WhatsApp y las redes las piden sin cookies.
 */
export function metadataCompartir(agencia: DominiosAgencia, slug: string, titulo: string, descripcion: string, ruta: string): Metadata {
  const imagen = { url: urlEnSitio(agencia, `/og/propiedad/${slug}`), ...OG_SIZE, alt: titulo, type: "image/jpeg" };
  return {
    alternates: { canonical: urlEnSitio(agencia, ruta) },
    openGraph: { type: "website", url: urlEnSitio(agencia, ruta), title: titulo, description: descripcion, images: [imagen] },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: [imagen.url] },
  };
}
