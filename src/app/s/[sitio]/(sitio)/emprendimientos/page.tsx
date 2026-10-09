import type { Metadata } from "next";
import { Listado, TITULO_MODO } from "@/components/sitio/listado";

export const metadata: Metadata = {
  title: TITULO_MODO.emprendimientos,
  description: "Emprendimientos en pozo y en construcción: fecha de entrega, avance de obra, financiación y planos navegables.",
  alternates: { canonical: "/emprendimientos" },
};

export default async function Page({ params, searchParams }: PageProps<"/s/[sitio]/emprendimientos">) {
  return <Listado modo="emprendimientos" sitio={(await params).sitio} searchParams={searchParams} />;
}
