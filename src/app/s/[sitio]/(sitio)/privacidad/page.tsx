import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BorrarHistorial } from "@/components/sitio/privacidad";
import { Container } from "@/components/ui/states";
import { getAgencia } from "@/lib/data/sitio";

export const revalidate = 3600;

// Se genera al primer pedido de cada inmobiliaria y queda en caché (la ruta incluye el sitio).
export function generateStaticParams() {
  return [];
}

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos registramos, para qué, quién los ve y cómo pedir la baja (Ley 25.326).",
  alternates: { canonical: "/privacidad" },
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PrivacidadPage({ params }: PageProps<"/s/[sitio]/privacidad">) {
  const agencia = await getAgencia((await params).sitio);
  if (!agencia) return null;
  const contactos = [
    agencia.email && `por email a ${agencia.email}`,
    agencia.whatsapp && `por WhatsApp al +${agencia.whatsapp}`,
    agencia.telefono && `por teléfono al ${agencia.telefono}`,
  ].filter(Boolean) as string[];
  const contacto = contactos.length ? contactos.join(", ") : "por los medios de contacto de este sitio";

  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Privacidad</h1>
      <p className="mt-2 text-muted">Política de tratamiento de datos personales conforme a la Ley 25.326 de Protección de Datos Personales.</p>

      <div className="mt-8 flex flex-col gap-8 leading-relaxed">
        <Seccion titulo="Quién es responsable">
          <p>
            <strong>{agencia.nombre}</strong>
            {agencia.direccion && `, con domicilio en ${agencia.direccion}`}, es responsable de los datos que se registran en este sitio. Podés
            contactarnos {contacto}.
          </p>
        </Seccion>

        <Seccion titulo="Qué registramos">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong>Tu recorrido, de forma anónima:</strong> un identificador al azar guardado en una cookie propia del sitio (no de terceros), las
              propiedades que mirás, las fotos, los ambientes del tour 360° y el tiempo en cada uno, los planos y si tocás el botón de WhatsApp. No
              usamos herramientas de analítica ni de publicidad de terceros.
            </li>
            <li>
              <strong>Los datos que nos dejás:</strong> nombre, teléfono, email y mensaje, y las respuestas del pedido de visita (forma de pago,
              plazo, si necesitás vender y horario preferido).
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>
            Para responder tus consultas, coordinar visitas y atender primero a quienes ya conocen la propiedad. También para entender qué partes
            de cada propiedad interesan más y mejorar cómo las presentamos. <strong>No vendemos ni cedemos tus datos.</strong>
          </p>
        </Seccion>

        <Seccion titulo="Cuándo se une tu recorrido con tus datos">
          <p>Tu recorrido es anónimo hasta que vos decidís contactarnos:</p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>cuando enviás una consulta o un pedido de visita con la casilla de consentimiento marcada;</li>
            <li>cuando nos escribís por WhatsApp desde el sitio (el mensaje incluye un código de referencia, por ejemplo “Ref. A7K2”);</li>
            <li>cuando abrís un link de pre-visita que te mandamos personalmente.</li>
          </ul>
        </Seccion>

        <Seccion titulo="Quién los ve y dónde se guardan">
          <p>
            Solo el equipo de {agencia.nombre}. Los datos se guardan en servicios de infraestructura (Supabase y Vercel) que los procesan por cuenta
            nuestra y no los usan para otros fines.
          </p>
        </Seccion>

        <Seccion titulo="Cuánto tiempo los guardamos">
          <p>
            El recorrido anónimo, hasta 12 meses. Los datos de contacto, mientras dure la gestión y hasta 24 meses después, salvo que pidas antes la
            baja.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos y cómo pedir la baja">
          <p>
            Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiéndonos {contacto}. Respondemos dentro de los plazos de
            la ley (10 días corridos para el acceso y 5 días hábiles para rectificar o suprimir).
          </p>
          <p>Si solo querés borrar tu recorrido anónimo, lo podés hacer acá mismo:</p>
          <BorrarHistorial />
          <p className="text-sm text-muted">
            Si tu navegador envía la señal “Global Privacy Control” (no rastrear), no registramos tu navegación.
          </p>
        </Seccion>

        <p className="rounded-xl bg-surface p-4 text-sm text-muted">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no
          inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley
          N° 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de
          atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
          materia de protección de datos personales.
        </p>
      </div>
    </Container>
  );
}
