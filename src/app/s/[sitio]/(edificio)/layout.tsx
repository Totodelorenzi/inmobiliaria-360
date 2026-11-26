import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { notFound } from "next/navigation";
import { AvisoPrivacidad, ScriptAvisoPrivacidad } from "@/components/sitio/privacidad";
import { getAgencia } from "@/lib/data/sitio";
import { aparienciaSitio } from "@/lib/fuentes";
import { leerTema } from "@/lib/tema";
import { FONDO_EDIFICIO, variablesEdificio } from "@/lib/tema-edificio";
import { urlEnSitio } from "@/lib/tenancy";

// Grotesca arquitectónica con eje de ancho: la misma familia da los títulos anchos y el texto.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--f-archivo-edificio" });

export async function generateMetadata({ params }: LayoutProps<"/s/[sitio]">): Promise<Metadata> {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return { title: "Sitio en configuración", robots: { index: false } };
  return {
    metadataBase: new URL(new URL(urlEnSitio(agencia)).origin),
    title: { default: agencia.nombre, template: `%s | ${agencia.nombre}` },
    openGraph: { siteName: agencia.nombre, locale: "es_AR", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: FONDO_EDIFICIO, colorScheme: "dark" };

/**
 * Módulo desarrolladora: landing del proyecto en una sola pantalla oscura (fachada con scroll →
 * piso → unidad → imágenes). El cierre con el aviso legal y el crédito va dentro de la experiencia.
 */
export default async function EdificioLayout({ children, params }: LayoutProps<"/s/[sitio]">) {
  const agencia = await getAgencia((await params).sitio);
  // Sin el módulo, estas direcciones no existen para esa inmobiliaria.
  if (!agencia || !agencia.modulos.includes("desarrolladora")) notFound();
  const apariencia = aparienciaSitio(agencia);
  const tipografia = leerTema(agencia.tema).tipografia;
  const fuentes = {
    // Sin tipografía propia en el tema, Archivo para todo.
    ...(tipografia.texto ? {} : { "--font-texto": "var(--f-archivo-edificio)" }),
    ...(tipografia.display || tipografia.texto ? {} : { "--font-titulos": "var(--f-archivo-edificio)" }),
  };
  return (
    <div
      style={{ ...apariencia.style, ...fuentes, ...variablesEdificio(null, agencia.color_primario) } as React.CSSProperties}
      className={`min-h-dvh bg-bg font-sans text-fg antialiased ${apariencia.className} ${archivo.variable}`}
    >
      {/* Sin franjas blancas al estirar la página en el celular. */}
      <style>{`html,body{background:${FONDO_EDIFICIO};color-scheme:dark}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}`}</style>
      {children}
      <ScriptAvisoPrivacidad />
      <AvisoPrivacidad />
    </div>
  );
}
