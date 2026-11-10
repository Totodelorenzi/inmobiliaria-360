import type { Metadata } from "next";
import { FormAgencia } from "@/components/admin/form-agencia";
import { Encabezado, Pagina } from "@/components/admin/ui";
import { requerirAdmin } from "@/lib/admin/sesion";
import { urlEnSitio } from "@/lib/tenancy";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const sesion = await requerirAdmin();
  return (
    <Pagina>
      <Encabezado titulo="Configuración" descripcion="Nombre, color, logo, datos de contacto y opciones de la web." />
      <FormAgencia agencia={sesion.agencia} linkNoContar={urlEnSitio(sesion.agencia, "/api/no-contar")} />
    </Pagina>
  );
}
