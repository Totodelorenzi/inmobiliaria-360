import type { Metadata, Viewport } from "next";
import { AvisoPrivacidad } from "@/components/sitio/privacidad";
import { SitioEnConfiguracion } from "@/components/sitio/secciones";
import { SiteFooter } from "@/components/sitio/site-footer";
import { SiteHeader } from "@/components/sitio/site-header";
import { brandStyle, normalizeHex } from "@/lib/color";
import { getAgencia } from "@/lib/data/sitio";

export async function generateMetadata(): Promise<Metadata> {
  const agencia = await getAgencia();
  if (!agencia) return { title: "Sitio en configuración", robots: { index: false } };
  return {
    title: { default: `${agencia.nombre} · Propiedades en alquiler y venta`, template: `%s | ${agencia.nombre}` },
    description: `Propiedades en alquiler y venta de ${agencia.nombre}. Recorrelas en 360° y mirá los planos desde tu celular.`,
    openGraph: { siteName: agencia.nombre, locale: "es_AR", type: "website" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const agencia = await getAgencia();
  return { themeColor: normalizeHex(agencia?.color_primario) ?? "#ffffff" };
}

export default async function SitioLayout({ children }: { children: React.ReactNode }) {
  const agencia = await getAgencia();
  if (!agencia) return <SitioEnConfiguracion />;

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
      <AvisoPrivacidad />
    </div>
  );
}
