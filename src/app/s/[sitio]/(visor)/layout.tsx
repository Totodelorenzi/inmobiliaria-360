import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AvisoPrivacidad } from "@/components/sitio/privacidad";
import { brandStyle } from "@/lib/color";
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
  return (
    <div style={brandStyle(agencia.color_primario)} className="fixed inset-0 overflow-hidden bg-black text-white">
      {children}
      <AvisoPrivacidad posicion="arriba" />
    </div>
  );
}
