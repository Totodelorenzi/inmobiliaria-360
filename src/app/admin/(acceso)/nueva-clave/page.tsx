import type { Metadata } from "next";
import { FormNuevaClave } from "@/components/admin/forms-acceso";
import { getEstadoSesion } from "@/lib/admin/sesion";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Elegir contraseña" };

export default async function NuevaClavePage() {
  const estado = await getEstadoSesion();
  if (estado.tipo === "sin-sesion") redirect("/admin/login?error=link");
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Elegí tu contraseña</h1>
      <p className="mb-4 text-sm text-muted">La vas a usar para entrar al panel desde cualquier dispositivo.</p>
      <FormNuevaClave />
    </>
  );
}
