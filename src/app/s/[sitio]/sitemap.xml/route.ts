import { getAgencia, getSlugs } from "@/lib/data/sitio";
import { urlEnSitio } from "@/lib/tenancy";

// Uno por inmobiliaria, con su dominio. Caché de Next bajo /s/<sitio>/ (separada por inmobiliaria).
export const dynamic = "force-static";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const escapar = (texto: string) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(_request: Request, { params }: RouteContext<"/s/[sitio]/sitemap.xml">) {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return new Response("No encontrado", { status: 404 });
  const fijas = ["/", "/alquiler", "/venta", "/emprendimientos"].map((ruta) => ({
    loc: urlEnSitio(agencia, ruta),
    changefreq: "daily",
    priority: ruta === "/" ? "1.0" : "0.8",
  }));
  const propiedades = (await getSlugs(agencia.id)).map(({ slug, updated_at }) => ({
    loc: urlEnSitio(agencia, `/propiedad/${slug}`),
    lastmod: updated_at,
    changefreq: "weekly",
    priority: "0.7",
  }));
  const urls = [...fijas, ...propiedades]
    .map((u) => {
      const lastmod = "lastmod" in u ? `<lastmod>${u.lastmod}</lastmod>` : "";
      return `<url><loc>${escapar(u.loc)}</loc>${lastmod}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`;
    })
    .join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
