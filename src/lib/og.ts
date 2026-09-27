import type { Metadata } from "next";

export const OG_SIZE = { width: 1200, height: 630 };

/** Open Graph + Twitter con la imagen de la propiedad (/og/propiedad/[slug]). */
export function metadataCompartir(slug: string, titulo: string, descripcion: string, url: string): Metadata {
  const imagen = { url: `/og/propiedad/${slug}`, ...OG_SIZE, alt: titulo };
  return {
    openGraph: { type: "website", url, title: titulo, description: descripcion, images: [imagen] },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: [imagen.url] },
  };
}
