import type { Viewport } from "next";
import { SitioEnConfiguracion } from "@/components/sitio/secciones";
import { brandStyle } from "@/lib/color";
import { getAgencia } from "@/lib/data/sitio";

export const viewport: Viewport = { themeColor: "#000000" };

/** Visores a pantalla completa: sin encabezado ni pie, fondo negro. */
export default async function VisorLayout({ children }: { children: React.ReactNode }) {
  const agencia = await getAgencia();
  if (!agencia) return <SitioEnConfiguracion />;
  return (
    <div style={brandStyle(agencia.color_primario)} className="fixed inset-0 overflow-hidden bg-black text-white">
      {children}
    </div>
  );
}
