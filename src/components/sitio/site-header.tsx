import Link from "next/link";
import { Container } from "@/components/ui/states";
import type { Agencia } from "@/lib/data/sitio";
import { BotonWhatsapp } from "./boton-whatsapp";
import { LINKS_SITIO } from "./links";
import { MenuMovil } from "./menu-movil";

export function Logo({ agencia, className }: { agencia: Agencia; className?: string }) {
  return agencia.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- logo servido desde Storage, sin optimizador
    <img src={agencia.logo_url} alt={agencia.nombre} className={`h-9 w-auto max-w-40 object-contain ${className ?? ""}`} />
  ) : (
    <span className={`font-display text-lg font-bold text-brand-ink ${className ?? ""}`}>{agencia.nombre}</span>
  );
}

export function SiteHeader({ agencia }: { agencia: Agencia }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <Container className="relative flex h-16 items-center gap-2">
        <Link href="/" className="mr-auto flex min-h-11 items-center" aria-label={`${agencia.nombre}, inicio`}>
          <Logo agencia={agencia} />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {LINKS_SITIO.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-xl px-3 font-medium hover:bg-surface"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {agencia.whatsapp && (
          <BotonWhatsapp numero={agencia.whatsapp} mensaje={`¡Hola ${agencia.nombre}! Quiero hacer una consulta.`} aria-label="Escribinos por WhatsApp">
            <span className="hidden sm:inline">WhatsApp</span>
          </BotonWhatsapp>
        )}
        <MenuMovil />
      </Container>
    </header>
  );
}
