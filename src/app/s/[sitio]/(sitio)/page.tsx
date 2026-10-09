import { Rotate3d } from "lucide-react";
import { JsonLd } from "@/components/sitio/json-ld";
import { BarraOperaciones, Buscador, SeccionPropiedades } from "@/components/sitio/secciones";
import { Container, EmptyState } from "@/components/ui/states";
import { getAgencia, getInicio } from "@/lib/data/sitio";
import { urlEnSitio } from "@/lib/tenancy";

export const revalidate = 3600;

// Se genera al primer pedido de cada inmobiliaria y queda en caché (la ruta incluye el sitio).
export function generateStaticParams() {
  return [];
}

export default async function Inicio({ params }: PageProps<"/s/[sitio]">) {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return null;
  const { alquiler, venta, emprendimientos, total } = await getInicio(agencia.id);
  const hayPropiedades = total.alquiler + total.venta + total.emprendimientos > 0;

  return (
    <>
      <section className="bg-brand text-brand-fg">
        <Container className="py-10 sm:py-16">
          <h1 className="max-w-2xl text-4xl leading-tight font-bold sm:text-5xl">Encontrá tu próxima propiedad</h1>
          <p className="mt-3 flex max-w-xl items-center gap-2 text-lg opacity-90">
            <Rotate3d className="size-6 shrink-0" aria-hidden /> Recorré cada ambiente en 360° antes de visitarla.
          </p>
          <Buscador total={total} />
        </Container>
      </section>

      {hayPropiedades ? (
        <>
          <SeccionPropiedades titulo="En alquiler" items={alquiler} total={total.alquiler} verTodas="/alquiler" prioridad />
          <SeccionPropiedades titulo="En venta" items={venta} total={total.venta} verTodas="/venta" />
          <SeccionPropiedades
            titulo="Emprendimientos en construcción"
            items={emprendimientos}
            total={total.emprendimientos}
            verTodas="/emprendimientos"
          />
        </>
      ) : (
        <Container className="py-12">
          <EmptyState
            title="Pronto vas a ver propiedades acá"
            description="Estamos cargando las propiedades. Mientras tanto, escribinos por WhatsApp y te ayudamos."
          />
        </Container>
      )}

      <BarraOperaciones total={total} />
      <div className="h-20 md:hidden" aria-hidden />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: agencia.nombre,
          url: urlEnSitio(agencia),
          ...(agencia.logo_url && { logo: agencia.logo_url, image: agencia.logo_url }),
          ...(agencia.telefono && { telephone: agencia.telefono }),
          ...(agencia.email && { email: agencia.email }),
          ...(agencia.direccion && { address: agencia.direccion }),
          sameAs: [agencia.instagram, agencia.facebook].filter(Boolean),
        }}
      />
    </>
  );
}
