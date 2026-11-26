import { Archivo } from "next/font/google";
import { notFound } from "next/navigation";
import { Experiencia } from "@/components/edificio/experiencia";
import { leerVista, vistaExiste } from "@/lib/edificio";
import { variablesEdificio } from "@/lib/tema-edificio";
import { proyectoDePrueba } from "../../../../../scripts/seed/mirador/fixture.ts";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--f-archivo-edificio" });

/**
 * Entorno de prueba local de la landing del proyecto (solo con `next dev`): el Edificio Mirador
 * armado en memoria con los dibujos provisorios, sin base de datos. En producción responde 404.
 */
export default async function PruebaEdificio({ params }: PageProps<"/dev/edificio/[[...vista]]">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const proyecto = proyectoDePrueba((nombre) => `/dev/edificio-img/${nombre}.svg`);
  const vista = leerVista((await params).vista ?? []);
  if (!vista || !vistaExiste(proyecto, vista)) notFound();
  return (
    <div
      style={{ ...variablesEdificio(proyecto.color_fondo, "#1d4d4f"), "--font-texto": "var(--f-archivo-edificio)", "--font-titulos": "var(--f-archivo-edificio)" } as React.CSSProperties}
      className={`min-h-dvh bg-bg font-sans text-fg antialiased ${archivo.variable}`}
    >
      <style>{`html,body{background:${proyecto.color_fondo};color-scheme:dark}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}`}</style>
      <Experiencia
        proyecto={proyecto}
        agencia={{ id: "00000000-0000-4000-8000-000000000000", nombre: "Desarrollos Demo", logo: null, whatsapp: "5492284000000" }}
        inicial={vista}
        base="/dev/edificio"
        urlPublica="http://localhost:3000/dev/edificio"
        credito={<span>Hecho con uDevelop</span>}
      />
    </div>
  );
}
