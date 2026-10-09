import { getAgencia } from "@/lib/data/sitio";
import { urlEnSitio } from "@/lib/tenancy";

export const dynamic = "force-static";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: RouteContext<"/s/[sitio]/robots.txt">) {
  const agencia = await getAgencia((await params).sitio);
  const reglas = agencia
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${urlEnSitio(agencia, "/sitemap.xml")}\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(reglas, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
