"use client";

import { CircleCheck, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { pedirContacto, type EstadoContacto } from "@/app/s/[sitio]/(edificio)/acciones";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { UnidadProyecto } from "@/lib/data/proyecto";
import { abrirWhatsapp, campana } from "./utiles";

export type PedidoContacto = { unidad: UnidadProyecto; origen: "galeria_fin" | "galeria_cierre" | "boton"; detalle: string | null };

type Props = {
  pedido: PedidoContacto | null;
  agencyId: string;
  projectId: string;
  proyecto: string;
  whatsapp: string | null;
  /** Link público de la unidad (va en el mensaje de WhatsApp). */
  url: (u: UnidadProyecto) => string;
  onCerrar: () => void;
};

/** "¿Te interesa el 3C?": nombre y WhatsApp, con la unidad ya cargada, y un botón directo a WhatsApp. */
export function Contacto({ pedido, ...resto }: Props) {
  return <AnimatePresence>{pedido && <Ventana key={pedido.unidad.id} pedido={pedido} {...resto} />}</AnimatePresence>;
}

/** "el 3C", "el local", "la cochera C4". */
function articulo(u: UnidadProyecto) {
  if (u.categoria === "local") return "el local";
  if (u.categoria === "cochera") return `la cochera ${u.codigo}`;
  return `el ${u.codigo}`;
}

function Ventana({ pedido, agencyId, projectId, proyecto, whatsapp, url, onCerrar }: Props & { pedido: PedidoContacto }) {
  const [estado, accion, enviando] = useActionState<EstadoContacto, FormData>(pedirContacto, { ok: false });
  const { unidad } = pedido;
  const v = estado.valores;
  const e = estado.errores;

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => ev.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  const mensaje = `Hola, me interesa ${articulo(unidad)} de ${proyecto}. ${url(unidad)}`;
  return (
    <m.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacto-titulo"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 text-fg shadow-2xl sm:p-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ y: 24, opacity: 0, transition: { duration: 0.2 } }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 id="contacto-titulo" className="font-display text-2xl leading-tight font-semibold [font-stretch:110%]">
              ¿Te interesa {articulo(unidad)}?
            </h2>
            <p className="mt-1 text-sm text-muted">Dejá tus datos y te escribimos por WhatsApp.</p>
          </div>
          <button type="button" onClick={onCerrar} className="-m-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10" aria-label="Cerrar">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {estado.ok ? (
          <div role="status" className="mt-5 flex flex-col items-center gap-2 rounded-2xl bg-success-bg p-6 text-center">
            <CircleCheck className="size-10 text-success" aria-hidden />
            <p className="text-lg font-semibold">¡Listo! Te escribimos a la brevedad.</p>
            {estado.codigo && (
              <p className="text-sm text-white/85">
                Tu código de consulta es <strong className="font-mono">{estado.codigo}</strong>.
              </p>
            )}
            <Button variant="outline" className="mt-2" onClick={onCerrar}>
              Seguir mirando
            </Button>
          </div>
        ) : (
          // key: al volver con errores, los campos se remontan con lo que se había escrito.
          <form key={JSON.stringify(v ?? {})} action={accion} className="mt-5 flex flex-col gap-4" noValidate>
            <input type="hidden" name="agencyId" value={agencyId} />
            <input type="hidden" name="unitId" value={unidad.id} />
            <input type="hidden" name="origen" value={pedido.origen} />
            {Object.entries(campana()).map(([k, valor]) => (
              <input key={k} type="hidden" name={`utm_${k}`} value={valor} />
            ))}
            <div className="hidden" aria-hidden>
              <label>
                Empresa
                <input name="empresa" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <p className="rounded-xl border border-white/10 px-3 py-2 text-sm">
              <span className="text-muted">Consulta por </span>
              <strong className="font-semibold">{unidad.categoria === "local" ? "Local comercial" : unidad.categoria === "cochera" ? `Cochera ${unidad.codigo}` : `Unidad ${unidad.codigo}`}</strong>
              {pedido.detalle && <span className="text-muted"> · {pedido.detalle}</span>}
            </p>
            {e?.general && (
              <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger">
                {e.general}
              </p>
            )}
            <Field label="Nombre" required error={e?.nombre}>
              {(a) => <Input {...a} name="nombre" autoComplete="name" defaultValue={v?.nombre} required autoFocus />}
            </Field>
            <Field label="WhatsApp" required error={e?.contacto} hint="Con código de área, por ejemplo 2284 15-123456.">
              {(a) => <Input {...a} name="telefono" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v?.telefono} required />}
            </Field>
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="acepto" defaultChecked={v?.acepto} required className="mt-1 size-5 shrink-0 accent-(--accent)" />
                <span className="text-sm text-white/85">
                  Acepto que la desarrolladora use estos datos y lo que miré en este sitio para escribirme.{" "}
                  <Link href="/privacidad" target="_blank" className="font-semibold text-(--accent) underline">
                    Privacidad
                  </Link>
                </span>
              </label>
              {e?.acepto && (
                <p role="alert" className="mt-1 text-sm font-medium text-danger">
                  {e.acepto}
                </p>
              )}
            </div>
            <Button type="submit" variant="accent" size="lg" fullWidth loading={enviando}>
              {enviando ? "Enviando…" : "Quiero que me escriban"}
            </Button>
          </form>
        )}

        {whatsapp && !estado.ok && (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(ev) => {
              ev.currentTarget.href = abrirWhatsapp(whatsapp, mensaje, { projectId, unitId: unidad.id, ubicacion: "contacto" });
            }}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 font-semibold transition-colors hover:border-[#25d366] hover:text-[#25d366]"
          >
            <WhatsappIcon className="size-5" /> Prefiero escribir por WhatsApp
          </a>
        )}
      </m.div>
    </m.div>
  );
}
