import { House, Inbox, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BorrarDemo } from "@/components/admin/propiedades-lista";
import { Aviso, Encabezado, Pagina, Panel } from "@/components/admin/ui";
import { Button, buttonStyles } from "@/components/ui/button";
import { crearBorrador } from "@/lib/admin/acciones";
import { getResumen } from "@/lib/admin/datos";
import { requerirSesion } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Inicio" };

const AVISOS: Record<string, { tono: "ok" | "alerta"; texto: string }> = {
  "clave-ok": { tono: "ok", texto: "¡Listo! Guardamos tu contraseña nueva." },
  "solo-admin": { tono: "alerta", texto: "Esa sección es solo para administradores de la inmobiliaria." },
};

const cuando = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const sesion = await requerirSesion();
  const { aviso } = await searchParams;
  const r = await getResumen(sesion.agencia.id);
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  const numeros = [
    { valor: r.publicadas, texto: "propiedades publicadas", href: "/admin/propiedades?estado=publicadas", Icono: House },
    { valor: r.borradores, texto: "borradores", href: "/admin/propiedades?estado=borradores", Icono: Pencil },
    { valor: r.leadsSemana, texto: "consultas en los últimos 7 días", href: "/admin/leads", Icono: Inbox },
  ];

  return (
    <Pagina>
      <Encabezado titulo="Inicio" descripcion={sesion.agencia.nombre} />
      {mensaje && (
        <div className="mb-4">
          <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {numeros.map(({ valor, texto, href, Icono }) => (
          <Link key={href} href={href} className="flex items-center gap-4 rounded-(--radius-card) border border-border bg-bg p-4 hover:border-brand">
            <span className="grid size-12 place-items-center rounded-full bg-surface text-brand-ink">
              <Icono className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-3xl font-bold">{valor}</span>
              <span className="text-sm text-muted">{texto}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <form action={crearBorrador}>
          <Button type="submit" variant="accent" size="lg" fullWidth>
            <Plus className="size-6" aria-hidden /> Cargar propiedad
          </Button>
        </form>
        <Link href="/admin/leads" className={buttonStyles({ variant: "outline", size: "lg", fullWidth: true })}>
          <Inbox className="size-6" aria-hidden /> Ver consultas
        </Link>
      </div>

      <Panel titulo="Últimas consultas" className="mt-6">
        {r.ultimosLeads.length === 0 ? (
          <p className="text-muted">Todavía no llegaron consultas. Van a aparecer acá apenas alguien escriba desde la web.</p>
        ) : (
          <ul className="divide-y divide-border">
            {r.ultimosLeads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="font-semibold">{lead.nombre ?? (lead.origen === "whatsapp_click" ? "Click en WhatsApp" : "Sin nombre")}</span>
                <span className="text-sm text-muted">{cuando.format(new Date(lead.created_at))}</span>
                <span className="w-full truncate text-sm text-muted">
                  {lead.propiedad ? lead.propiedad.titulo : "Consulta general"}
                  {lead.telefono && ` · ${lead.telefono}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {r.demo > 0 && sesion.rol === "admin" && (
        <Panel titulo="Datos de ejemplo" className="mt-6">
          <p className="mb-4 text-muted">
            Hay {r.demo} propiedades de ejemplo para mostrar cómo se ve la web. Cuando cargues las tuyas, borralas con este botón.
          </p>
          <BorrarDemo cantidad={r.demo} />
        </Panel>
      )}
    </Pagina>
  );
}
