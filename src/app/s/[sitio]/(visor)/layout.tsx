import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AvisoPrivacidad, ScriptAvisoPrivacidad } from "@/components/sitio/privacidad";
import { aparienciaSitio } from "@/lib/fuentes";
import { getAgencia } from "@/lib/data/sitio";
import { urlEnSitio } from "@/lib/tenancy";

export const viewport: Viewport = { themeColor: "#000000" };

export async function generateMetadata({ params }: LayoutProps<"/s/[sitio]">): Promise<Metadata> {
  const agencia = await getAgencia((await params).sitio);
  return agencia ? { metadataBase: new URL(new URL(urlEnSitio(agencia)).origin) } : { robots: { index: false } };
}

/** Visores a pantalla completa: sin encabezado ni pie, fondo negro. */
export default async function VisorLayout({ children, params }: LayoutProps<"/s/[sitio]">) {
  const agencia = await getAgencia((await params).sitio);
  // Ninguna inmobiliaria en esta dirección: 404 con la página neutra de la plataforma.
  if (!agencia) notFound();
  const apariencia = aparienciaSitio(agencia);
  return (
    <div style={apariencia.style} className={`fixed inset-0 overflow-hidden bg-black font-sans text-white ${apariencia.className}`}>
      {children}
      <ScriptAvisoPrivacidad />
      <AvisoPrivacidad posicion="arriba" />
    </div>
  );
}
