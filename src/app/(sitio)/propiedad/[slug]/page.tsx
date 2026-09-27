import {
  Bath,
  BadgeCheck,
  BedDouble,
  Building,
  Car,
  DraftingCompass,
  HardHat,
  House,
  LayoutGrid,
  MapPin,
  Maximize,
  Percent,
  Receipt,
  Rotate3d,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BotonWhatsapp } from "@/components/sitio/boton-whatsapp";
import { FormConsulta } from "@/components/sitio/form-consulta";
import { Galeria } from "@/components/sitio/galeria";
import { JsonLd } from "@/components/sitio/json-ld";
import { Mapa } from "@/components/sitio/mapa";
import { SeccionPropiedades } from "@/components/sitio/secciones";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/states";
import { getAgencia, getPropiedad, getRelacionadas, getSlugs, type PropiedadCompleta } from "@/lib/data/sitio";
import { getSiteUrl } from "@/lib/env";
import {
  badgeObra,
  ESTADO_OBRA_LABEL,
  formatExpensas,
  formatM2,
  formatMesAnio,
  formatPrecio,
  formatUbicacion,
  OPERACION_LABEL,
  plural,
  TIPO_LABEL,
  whatsappLink,
} from "@/lib/format";
import { ubicacionPublica } from "@/lib/geo";
import { metadataCompartir } from "@/lib/og";

export const revalidate = 3600;

export async function generateStaticParams() {
  const agencia = await getAgencia();
  return agencia ? (await getSlugs(agencia.id)).map(({ slug }) => ({ slug })) : [];
}

async function cargar(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const agencia = await getAgencia();
  const propiedad = agencia ? await getPropiedad(agencia.id, slug) : null;
  return { agencia, propiedad };
}

function resumen(p: PropiedadCompleta) {
  const partes = [
    `${TIPO_LABEL[p.tipo]} en ${p.operacion === "alquiler" ? "alquiler" : "venta"}`,
    formatUbicacion(p) && `en ${formatUbicacion(p)}`,
    p.ambientes && plural(p.ambientes, "ambiente"),
    formatM2(p.superficie_total),
  ].filter(Boolean);
  const extra = p.cantidadEscenas > 0 ? " Recorrela en 360° desde tu celular." : "";
  return `${partes.join(", ")}. ${formatPrecio(p.precio, p.moneda, p.operacion)}.${extra}`;
}

export async function generateMetadata({ params }: PageProps<"/propiedad/[slug]">): Promise<Metadata> {
  const { propiedad: p } = await cargar(params);
  if (!p) return { title: "Propiedad no encontrada" };
  return {
    title: `${p.titulo} · ${formatPrecio(p.precio, p.moneda, p.operacion)}`,
    description: resumen(p).slice(0, 160),
    alternates: { canonical: `/propiedad/${p.slug}` },
    ...metadataCompartir(p.slug, p.titulo, resumen(p).slice(0, 200), `/propiedad/${p.slug}`),
  };
}

export default async function FichaPropiedad({ params }: PageProps<"/propiedad/[slug]">) {
  const { agencia, propiedad: p } = await cargar(params);
  if (!agencia || !p) notFound();

  const url = `${getSiteUrl()}/propiedad/${p.slug}`;
  const precio = formatPrecio(p.precio, p.moneda, p.operacion);
  const expensas = formatExpensas(p.expensas);
  const ubicacion = formatUbicacion(p);
  const obra = badgeObra(p.estado_obra, p.fecha_entrega);
  const mapa = ubicacionPublica(p.id, p.lat, p.lng, p.mostrar_direccion_exacta);
  const mensajeWhatsapp = `¡Hola! Me interesa "${p.titulo}" (${precio}). ${url}`;
  const relacionadas = await getRelacionadas(p);

  const ficha: { icono: ReactNode; label: string; valor: string | null }[] = [
    { icono: <Building />, label: "Tipo", valor: TIPO_LABEL[p.tipo] },
    { icono: <LayoutGrid />, label: "Ambientes", valor: p.ambientes ? String(p.ambientes) : null },
    { icono: <BedDouble />, label: "Dormitorios", valor: p.dormitorios != null ? String(p.dormitorios) : null },
    { icono: <Bath />, label: "Baños", valor: p.banos ? String(p.banos) : null },
    { icono: <Maximize />, label: "Superficie total", valor: formatM2(p.superficie_total) },
    { icono: <House />, label: "Superficie cubierta", valor: formatM2(p.superficie_cubierta) },
    { icono: <Car />, label: "Cocheras", valor: p.cochera > 0 ? String(p.cochera) : null },
    { icono: <Receipt />, label: "Expensas", valor: expensas },
    { icono: <BadgeCheck />, label: "Apto crédito", valor: p.apto_credito ? "Sí" : null },
    { icono: <Percent />, label: "Financiación", valor: p.acepta_financiacion ? "Sí" : null },
  ];

  return (
    <>
      <Container className="px-0 sm:px-6 sm:pt-4">
        <div className="overflow-hidden sm:rounded-(--radius-card)">
          <Galeria fotos={p.fotos} titulo={p.titulo} />
        </div>
      </Container>

      <Container className="grid gap-8 py-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{OPERACION_LABEL[p.operacion]}</Badge>
              <Badge>{TIPO_LABEL[p.tipo]}</Badge>
              {obra && (
                <Badge tone="warning">
                  <HardHat aria-hidden /> {obra}
                </Badge>
              )}
            </div>
            <div>
              <p className="font-display text-3xl font-bold sm:text-4xl">{precio}</p>
              {expensas && <p className="text-muted">+ {expensas} de expensas</p>}
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{p.titulo}</h1>
            {ubicacion && (
              <p className="flex items-start gap-1.5 text-muted">
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
                {ubicacion}
                {!p.mostrar_direccion_exacta && " (zona aproximada)"}
              </p>
            )}
          </header>

          {(p.cantidadEscenas > 0 || p.cantidadPlanos > 0) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {p.cantidadEscenas > 0 && (
                <Link
                  href={`/propiedad/${p.slug}/tour`}
                  className={buttonStyles({ variant: "accent", size: "lg", fullWidth: true, className: "text-lg sm:flex-1" })}
                >
                  <Rotate3d className="size-7" aria-hidden /> Recorrer la propiedad en 360°
                </Link>
              )}
              {p.cantidadPlanos > 0 && (
                <Link
                  href={`/propiedad/${p.slug}/planos`}
                  className={buttonStyles({ variant: "accent", size: "lg", fullWidth: true, className: "text-lg sm:flex-1" })}
                >
                  <DraftingCompass className="size-7" aria-hidden /> Ver planos
                </Link>
              )}
            </div>
          )}

          {p.estado_obra !== "terminada" && (
            <section aria-labelledby="titulo-obra" className="flex flex-col gap-4 rounded-(--radius-card) border border-border bg-surface p-5">
              <h2 id="titulo-obra" className="flex items-center gap-2 text-xl font-bold">
                <HardHat className="size-6" aria-hidden /> Estado de obra
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted">Estado</dt>
                  <dd className="font-semibold">{ESTADO_OBRA_LABEL[p.estado_obra]}</dd>
                </div>
                {p.fecha_entrega && (
                  <div>
                    <dt className="text-sm text-muted">Entrega estimada</dt>
                    <dd className="font-semibold first-letter:uppercase">{formatMesAnio(p.fecha_entrega)}</dd>
                  </div>
                )}
              </dl>
              {p.avance_obra_pct != null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span id="label-avance">Avance de obra</span>
                    <span className="font-semibold">{p.avance_obra_pct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-labelledby="label-avance"
                    aria-valuenow={p.avance_obra_pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-3 overflow-hidden rounded-full bg-border"
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${p.avance_obra_pct}%` }} />
                  </div>
                </div>
              )}
              {p.acepta_financiacion && (
                <p className="flex items-start gap-2">
                  <Percent className="mt-0.5 size-5 shrink-0 text-brand-ink" aria-hidden />
                  <span>
                    <strong>Financiación:</strong> {p.detalle_financiacion || "consultá las opciones disponibles."}
                  </span>
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="titulo-ficha">
            <h2 id="titulo-ficha" className="mb-4 text-xl font-bold">
              Características
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ficha
                .filter((item) => item.valor)
                .map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                    <span className="text-brand-ink [&_svg]:size-6" aria-hidden>
                      {item.icono}
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{item.label}</dt>
                      <dd className="font-semibold">{item.valor}</dd>
                    </div>
                  </div>
                ))}
            </dl>
          </section>

          {p.amenities.length > 0 && (
            <section aria-labelledby="titulo-amenities">
              <h2 id="titulo-amenities" className="mb-3 flex items-center gap-2 text-xl font-bold">
                <Sparkles className="size-5 text-brand-ink" aria-hidden /> Amenities
              </h2>
              <ul className="flex flex-wrap gap-2">
                {p.amenities.map((amenity) => (
                  <li key={amenity} className="rounded-full border border-border px-3 py-1.5 text-sm font-medium">
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.descripcion && (
            <section aria-labelledby="titulo-descripcion">
              <h2 id="titulo-descripcion" className="mb-3 text-xl font-bold">
                Descripción
              </h2>
              <p className="leading-relaxed whitespace-pre-line">{p.descripcion}</p>
            </section>
          )}

          {mapa && (
            <section aria-labelledby="titulo-ubicacion">
              <h2 id="titulo-ubicacion" className="mb-3 text-xl font-bold">
                Ubicación
              </h2>
              <Mapa ubicacion={mapa} zona={ubicacion || "la zona"} />
              {!mapa.exacta && (
                <p className="mt-2 text-sm text-muted">Por privacidad mostramos la zona aproximada. Consultanos la dirección exacta.</p>
              )}
            </section>
          )}
        </div>

        <aside id="consulta" aria-labelledby="titulo-consulta" className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="rounded-(--radius-card) border border-border p-5 shadow-(--shadow-card)">
            <h2 id="titulo-consulta" className="mb-4 text-xl font-bold">
              Consultá por esta propiedad
            </h2>
            {agencia.whatsapp && (
              <BotonWhatsapp
                href={whatsappLink(agencia.whatsapp, mensajeWhatsapp)}
                agencyId={agencia.id}
                propertyId={p.id}
                size="lg"
                fullWidth
                className="mb-4 hidden md:inline-flex"
              >
                Consultar por WhatsApp
              </BotonWhatsapp>
            )}
            <FormConsulta agencyId={agencia.id} propertyId={p.id} />
          </div>
        </aside>
      </Container>

      <SeccionPropiedades titulo="Propiedades similares" items={relacionadas} total={0} verTodas={`/${p.operacion}`} />

      {/* Barra fija en el celular: precio + WhatsApp */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">{OPERACION_LABEL[p.operacion]}</p>
            <p className="truncate font-display text-lg font-bold">{precio}</p>
          </div>
          {agencia.whatsapp ? (
            <BotonWhatsapp
              href={whatsappLink(agencia.whatsapp, mensajeWhatsapp)}
              agencyId={agencia.id}
              propertyId={p.id}
              className="ml-auto"
            >
              Consultar por WhatsApp
            </BotonWhatsapp>
          ) : (
            <a href="#consulta" className={buttonStyles({ variant: "brand", className: "ml-auto" })}>
              Consultar
            </a>
          )}
        </div>
      </div>
      <div className="h-20 md:hidden" aria-hidden />

      <JsonLd data={jsonLd(p, url)} />
    </>
  );
}

function jsonLd(p: PropiedadCompleta, url: string) {
  const exacta = p.mostrar_direccion_exacta;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.titulo,
    description: p.descripcion?.slice(0, 500) ?? resumen(p),
    url,
    datePosted: p.created_at,
    image: p.fotos.slice(0, 6).map((f) => f.url),
    ...(p.precio != null && {
      offers: {
        "@type": "Offer",
        price: p.precio,
        priceCurrency: p.moneda,
        availability: "https://schema.org/InStock",
        businessFunction: `http://purl.org/goodrelations/v1#${p.operacion === "alquiler" ? "LeaseOut" : "Sell"}`,
      },
    }),
    about: {
      "@type": p.tipo === "casa" ? "SingleFamilyResidence" : p.tipo === "departamento" || p.tipo === "ph" ? "Apartment" : "Place",
      ...(p.ambientes && { numberOfRooms: p.ambientes }),
      ...(p.dormitorios != null && { numberOfBedrooms: p.dormitorios }),
      ...(p.banos && { numberOfBathroomsTotal: p.banos }),
      ...(p.superficie_total && { floorSize: { "@type": "QuantitativeValue", value: p.superficie_total, unitCode: "MTK" } }),
      address: {
        "@type": "PostalAddress",
        ...(exacta && p.direccion && { streetAddress: p.direccion }),
        ...(p.barrio && { addressLocality: p.barrio }),
        ...(p.ciudad && { addressRegion: p.ciudad }),
        addressCountry: "AR",
      },
      ...(exacta && p.lat != null && p.lng != null && { geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } }),
    },
  };
}
