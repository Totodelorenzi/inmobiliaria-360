import type { MetadataRoute } from "next";
import { getAgencia, getSlugs } from "@/lib/data/sitio";
import { getSiteUrl } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const fijas = ["", "/alquiler", "/venta", "/emprendimientos"].map((ruta) => ({
    url: `${base}${ruta}`,
    changeFrequency: "daily" as const,
    priority: ruta === "" ? 1 : 0.8,
  }));
  const agencia = await getAgencia();
  if (!agencia) return fijas;
  const propiedades = (await getSlugs(agencia.id)).map(({ slug, updated_at }) => ({
    url: `${base}/propiedad/${slug}`,
    lastModified: updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...fijas, ...propiedades];
}
