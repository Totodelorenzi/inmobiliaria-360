import type { Metadata } from "next";
import { Listado, TITULO_MODO } from "@/components/sitio/listado";

export const metadata: Metadata = {
  title: TITULO_MODO.emprendimientos,
  description: "Emprendimientos en pozo y en construcción: fecha de entrega, avance de obra, financiación y planos navegables.",
  alternates: { canonical: "/emprendimientos" },
};

export default function Page({ searchParams }: PageProps<"/emprendimientos">) {
  return <Listado modo="emprendimientos" searchParams={searchParams} />;
}
