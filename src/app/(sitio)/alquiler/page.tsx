import type { Metadata } from "next";
import { Listado, TITULO_MODO } from "@/components/sitio/listado";

export const metadata: Metadata = {
  title: TITULO_MODO.alquiler,
  description: "Departamentos, casas y PH en alquiler. Filtrá por barrio, precio y ambientes, y recorrelos en 360°.",
  alternates: { canonical: "/alquiler" },
};

export default function Page({ searchParams }: PageProps<"/alquiler">) {
  return <Listado modo="alquiler" searchParams={searchParams} />;
}
