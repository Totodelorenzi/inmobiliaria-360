import type { Metadata } from "next";
import { FormAsesor, ListaAsesores } from "@/components/admin/asesores";
import { Encabezado, Pagina, Panel } from "@/components/admin/ui";
import { getAsesores } from "@/lib/admin/datos";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Asesores" };

export default async function AsesoresPage() {
  const sesion = await requerirAdmin();
  const asesores = await getAsesores(sesion.agencia.id);
  return (
    <Pagina>
      <Encabezado
        titulo="Asesores"
        descripcion="Quiénes atienden cada propiedad. Su foto, nombre y matrícula se ven en la ficha y las consultas por WhatsApp les llegan directo."
      />
      <div className="flex flex-col gap-5">
        <Panel titulo={`Equipo comercial (${asesores.length})`}>
          <ListaAsesores asesores={asesores} agencyId={sesion.agencia.id} />
        </Panel>
        <Panel titulo="Agregar un asesor">
          <FormAsesor agencyId={sesion.agencia.id} />
        </Panel>
      </div>
    </Pagina>
  );
}
