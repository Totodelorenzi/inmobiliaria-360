import type { Metadata } from "next";
import { FormAgencia } from "@/components/admin/form-agencia";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const sesion = await requerirAdmin();
  return (
    <Pagina>
      <Encabezado titulo="Configuración" descripcion="Nombre, color, logo y datos de contacto que se ven en la web." />
      <FormAgencia agencia={sesion.agencia} />
    </Pagina>
  );
}
