import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/states";
import type { Agencia } from "@/lib/data/sitio";
import { whatsappLink } from "@/lib/format";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "./iconos-marca";
import { LINKS_SITIO } from "./links";

const linkClase = "inline-flex min-h-11 items-center gap-2 hover:underline [&_svg]:size-5 [&_svg]:shrink-0";

export function SiteFooter({ agencia }: { agencia: Agencia }) {
  const redes = [
    agencia.instagram && { href: agencia.instagram, label: "Instagram", Icono: InstagramIcon },
    agencia.facebook && { href: agencia.facebook, label: "Facebook", Icono: FacebookIcon },
  ].filter(Boolean) as { href: string; label: string; Icono: typeof InstagramIcon }[];

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">{agencia.nombre}</p>
          <p className="mt-2 text-sm text-muted">Propiedades en alquiler y venta con tour virtual 360°.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contacto</h2>
          <ul className="mt-2 flex flex-col">
            {agencia.whatsapp && (
              <li>
                <a className={linkClase} href={whatsappLink(agencia.whatsapp, "¡Hola! Quiero hacer una consulta.")} target="_blank" rel="noopener noreferrer">
                  <WhatsappIcon /> WhatsApp
                </a>
              </li>
            )}
            {agencia.telefono && (
              <li>
                <a className={linkClase} href={`tel:${agencia.telefono.replace(/[^\d+]/g, "")}`}>
                  <Phone aria-hidden /> {agencia.telefono}
                </a>
              </li>
            )}
            {agencia.email && (
              <li>
                <a className={linkClase} href={`mailto:${agencia.email}`}>
                  <Mail aria-hidden /> {agencia.email}
                </a>
              </li>
            )}
            {agencia.direccion && (
              <li className="flex min-h-11 items-center gap-2 [&_svg]:size-5">
                <MapPin aria-hidden /> {agencia.direccion}
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Propiedades</h2>
          <ul className="mt-2 flex flex-col">
            {LINKS_SITIO.map((link) => (
              <li key={link.href}>
                <Link className={linkClase} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {redes.length > 0 && (
            <ul className="mt-4 flex gap-2">
              {redes.map(({ href, label, Icono }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-11 place-items-center rounded-full bg-bg hover:bg-border"
                  >
                    <Icono className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <p className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {agencia.nombre} ·{" "}
        <Link href="/privacidad" className="inline-flex min-h-11 items-center underline">
          Privacidad
        </Link>
      </p>
    </footer>
  );
}
