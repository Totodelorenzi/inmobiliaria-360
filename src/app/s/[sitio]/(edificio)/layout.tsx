import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvisoPrivacidad, ScriptAvisoPrivacidad } from "@/components/sitio/privacidad";
import { CreditoPlataforma } from "@/components/sitio/site-footer";
import { normalizeHex } from "@/lib/color";
import { getAgencia } from "@/lib/data/sitio";
import { aparienciaSitio } from "@/lib/fuentes";
import { urlEnSitio } from "@/lib/tenancy";

export async function generateMetadata({ params }: LayoutProps<"/s/[sitio]">): Promise<Metadata> {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return { title: "Sitio en configuración", robots: { index: false } };
  return {
    metadataBase: new URL(new URL(urlEnSitio(agencia)).origin),
    title: { default: agencia.nombre, template: `%s | ${agencia.nombre}` },
    openGraph: { siteName: agencia.nombre, locale: "es_AR", type: "website" },
  };
}

export async function generateViewport({ params }: LayoutProps<"/s/[sitio]">): Promise<Viewport> {
  const agencia = await getAgencia((await params).sitio);
  return { themeColor: normalizeHex(agencia?.color_primario) ?? "#ffffff" };
}

/**
 * Módulo desarrolladora: recorrido del edificio (fachada → piso → unidad → ambientes). Pantallas
 * livianas, pensadas para el celular, con el aviso legal y el crédito siempre al pie.
 */
export default async function EdificioLayout({ children, params }: LayoutProps<"/s/[sitio]">) {
  const agencia = await getAgencia((await params).sitio);
  // Sin el módulo, estas direcciones no existen para esa inmobiliaria.
  if (!agencia || !agencia.modulos.includes("desarrolladora")) notFound();
  const apariencia = aparienciaSitio(agencia);
  return (
    <div style={apariencia.style} className={`flex min-h-dvh flex-col bg-bg font-sans text-fg ${apariencia.className}`}>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-muted">
        <p className="font-medium">Imágenes ilustrativas, no contractuales</p>
        <p>
          © {new Date().getFullYear()} {agencia.nombre} ·{" "}
          <Link href="/privacidad" className="inline-flex min-h-11 items-center underline">
            Privacidad
          </Link>
          {" · "}
          <CreditoPlataforma />
        </p>
      </footer>
      <ScriptAvisoPrivacidad />
      <AvisoPrivacidad />
    </div>
  );
}
