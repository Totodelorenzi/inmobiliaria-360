import type { Metadata } from "next";
import { Listado, TITULO_MODO } from "@/components/sitio/listado";

export const metadata: Metadata = {
  title: TITULO_MODO.venta,
  description: "Propiedades en venta. Filtrá por barrio, precio, ambientes y apto crédito, y recorrelas en 360°.",
  alternates: { canonical: "/venta" },
};

export default async function Page({ params, searchParams }: PageProps<"/s/[sitio]/venta">) {
  return <Listado modo="venta" sitio={(await params).sitio} searchParams={searchParams} />;
}
