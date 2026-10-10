import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AvisoPrivacidad, ScriptAvisoPrivacidad } from "@/components/sitio/privacidad";
import { SiteFooter } from "@/components/sitio/site-footer";
import { SiteHeader } from "@/components/sitio/site-header";
import { brandStyle, normalizeHex } from "@/lib/color";
import { getAgencia } from "@/lib/data/sitio";
import { urlEnSitio } from "@/lib/tenancy";

export async function generateMetadata({ params }: LayoutProps<"/s/[sitio]">): Promise<Metadata> {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return { title: "Sitio en configuración", robots: { index: false } };
  return {
    // Las URL absolutas (Open Graph, canónicas) usan el dominio real de la inmobiliaria.
    metadataBase: new URL(new URL(urlEnSitio(agencia)).origin),
    title: { default: `${agencia.nombre} · Propiedades en alquiler y venta`, template: `%s | ${agencia.nombre}` },
    description: `Propiedades en alquiler y venta de ${agencia.nombre}. Recorrelas en 360° y mirá los planos desde tu celular.`,
    openGraph: { siteName: agencia.nombre, locale: "es_AR", type: "website" },
  };
}

export async function generateViewport({ params }: LayoutProps<"/s/[sitio]">): Promise<Viewport> {
  const agencia = await getAgencia((await params).sitio);
  return { themeColor: normalizeHex(agencia?.color_primario) ?? "#ffffff" };
}

export default async function SitioLayout({ children, params }: LayoutProps<"/s/[sitio]">) {
  const agencia = await getAgencia((await params).sitio);
  // Ninguna inmobiliaria en esta dirección: 404 con la página neutra de la plataforma.
  if (!agencia) notFound();

  return (
    <div style={brandStyle(agencia.color_primario)} className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-xl bg-bg px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader agencia={agencia} />
      <main id="contenido" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter agencia={agencia} />
      <ScriptAvisoPrivacidad />
      <AvisoPrivacidad />
    </div>
  );
}
