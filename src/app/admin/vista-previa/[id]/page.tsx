import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisorTour } from "@/components/visor/visor-tour";
import { getPropiedadEditor } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";
import { brandStyle } from "@/lib/color";

export const metadata: Metadata = { title: "Vista previa del tour" };

/** Tour de un borrador (no público) a pantalla completa, solo para el panel. */
export default async function VistaPrevia({ params }: PageProps<"/admin/vista-previa/[id]">) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const p = await getPropiedadEditor(id);
  if (!p || p.agency_id !== sesion.agencia.id || p.escenas.length === 0) notFound();

  return (
    <div style={brandStyle(sesion.agencia.color_primario)} className="fixed inset-0 bg-black text-white">
      <VisorTour
        escenas={p.escenas}
        titulo={`Vista previa · ${p.titulo}`}
        slug={p.slug}
        tienePlanos={false}
        whatsapp={null}
        volverA={`/admin/propiedades/${p.id}?paso=tour`}
      />
    </div>
  );
}
