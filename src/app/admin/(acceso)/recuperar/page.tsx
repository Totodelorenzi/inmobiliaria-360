import type { Metadata } from "next";
import { FormRecuperar } from "@/components/admin/forms-acceso";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Recuperar contraseña</h1>
      <FormRecuperar />
    </>
  );
}
