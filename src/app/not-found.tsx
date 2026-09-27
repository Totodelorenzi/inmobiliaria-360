import type { Metadata } from "next";
import { NoEncontrado } from "@/components/sitio/estados";
import SitioLayout from "./(sitio)/layout";

export const metadata: Metadata = { title: "Página no encontrada" };

// 404 de URLs que no coinciden con ninguna ruta: misma estética que el sitio.
export default function NotFound() {
  return (
    <SitioLayout>
      <NoEncontrado />
    </SitioLayout>
  );
}
