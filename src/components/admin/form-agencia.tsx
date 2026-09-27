"use client";

import { ImagePlus, Rotate3d, Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { WhatsappIcon } from "@/components/sitio/iconos-marca";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { guardarAgencia, type EstadoAgencia } from "@/lib/admin/acciones-agencia";
import { procesarLogo } from "@/lib/admin/imagenes";
import { subirArchivo } from "@/lib/admin/subida";
import { brandStyle, normalizeHex } from "@/lib/color";
import type { Tables } from "@/types/database";
import { Aviso, Panel } from "./ui";

export function FormAgencia({ agencia }: { agencia: Tables<"agencies"> }) {
  const [estado, accion, guardando] = useActionState<EstadoAgencia, FormData>(guardarAgencia, {});
  const [color, setColor] = useState(agencia.color_primario);
  const [nombre, setNombre] = useState(agencia.nombre);
  const [logo, setLogo] = useState(agencia.logo_url ?? "");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const e = estado.errores ?? {};
  const colorValido = normalizeHex(color);

  async function subirLogo(archivo: File) {
    setSubiendoLogo(true);
    setErrorLogo(null);
    try {
      const { blob, extension } = await procesarLogo(archivo);
      const url = await subirArchivo({ bucket: "fotos", ruta: `${agencia.id}/agencia/logo-${crypto.randomUUID().slice(0, 8)}.${extension}`, archivo: blob });
      setLogo(url);
    } catch (err) {
      setErrorLogo(err instanceof Error ? err.message : "No se pudo subir el logo.");
    } finally {
      setSubiendoLogo(false);
    }
  }

  return (
    <form action={accion} className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="flex flex-col gap-5">
        {e.general && <Aviso tono="error">{e.general}</Aviso>}
        {estado.ok && estado.mensaje && <Aviso tono="ok">{estado.mensaje}</Aviso>}

        <Panel titulo="Identidad">
          <div className="flex flex-col gap-4">
            <Field label="Nombre de la inmobiliaria" required error={e.nombre}>
              {(a) => <Input {...a} name="nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} maxLength={120} required />}
            </Field>
            <Field label="Color principal" error={e.color_primario} hint="Se usa en botones, títulos y el encabezado de la web.">
              {(a) => (
                <div className="flex gap-2">
                  <input type="color" value={colorValido ?? "#1f3a5f"} onChange={(ev) => setColor(ev.target.value)} className="h-11 w-16 cursor-pointer rounded-xl border border-border" aria-label="Elegir color" />
                  <Input {...a} name="color_primario" value={color} onChange={(ev) => setColor(ev.target.value)} maxLength={7} className="font-mono" />
                </div>
              )}
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Logo</p>
              <input type="hidden" name="logo_url" value={logo} />
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-16 w-40 place-items-center overflow-hidden rounded-xl border border-border bg-bg p-2">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo
                    <img src={logo} alt="Logo actual" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted">Sin logo</span>
                  )}
                </div>
                <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={subiendoLogo}>
                  {subiendoLogo ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden />} {logo ? "Cambiar" : "Subir logo"}
                </Button>
                {logo && (
                  <Button variant="ghost" onClick={() => setLogo("")}>
                    <Trash2 className="size-4" aria-hidden /> Quitar
                  </Button>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(ev) => ev.target.files?.[0] && subirLogo(ev.target.files[0])} />
              {errorLogo && <p className="mt-1 text-sm text-danger">{errorLogo}</p>}
              <p className="mt-1 text-sm text-muted">Mejor en PNG con fondo transparente. Se guarda al tocar “Guardar cambios”.</p>
            </div>
          </div>
        </Panel>

        <Panel titulo="Contacto">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp" error={e.whatsapp} hint="Con código de país, sin + ni espacios: 5491122334455.">
              {(a) => <Input {...a} name="whatsapp" defaultValue={agencia.whatsapp ?? ""} inputMode="tel" placeholder="5491122334455" />}
            </Field>
            <Field label="Teléfono" error={e.telefono}>
              {(a) => <Input {...a} name="telefono" defaultValue={agencia.telefono ?? ""} inputMode="tel" placeholder="011 4444-5555" />}
            </Field>
            <Field label="Email" error={e.email}>
              {(a) => <Input {...a} name="email" type="email" defaultValue={agencia.email ?? ""} />}
            </Field>
            <Field label="Dirección de la oficina" error={e.direccion}>
              {(a) => <Input {...a} name="direccion" defaultValue={agencia.direccion ?? ""} />}
            </Field>
            <Field label="Instagram (link)" error={e.instagram}>
              {(a) => <Input {...a} name="instagram" type="url" defaultValue={agencia.instagram ?? ""} placeholder="https://instagram.com/tuinmobiliaria" />}
            </Field>
            <Field label="Facebook (link)" error={e.facebook}>
              {(a) => <Input {...a} name="facebook" type="url" defaultValue={agencia.facebook ?? ""} placeholder="https://facebook.com/tuinmobiliaria" />}
            </Field>
          </div>
        </Panel>

        <Button type="submit" variant="brand" size="lg" loading={guardando} disabled={subiendoLogo}>
          Guardar cambios
        </Button>
      </div>

      <aside className="lg:sticky lg:top-6" aria-label="Vista previa">
        <p className="mb-2 text-sm font-semibold text-muted">Vista previa</p>
        <div style={brandStyle(colorValido)} className="overflow-hidden rounded-(--radius-card) border border-border bg-bg shadow-(--shadow-card)">
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo
              <img src={logo} alt="" className="h-7 w-auto max-w-28 object-contain" />
            ) : (
              <span className="truncate font-display font-bold text-brand-ink">{nombre || "Tu inmobiliaria"}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#0e7a40] px-2 py-1 text-xs font-semibold text-white">
              <WhatsappIcon className="size-3.5" /> WhatsApp
            </span>
          </div>
          <div className="bg-brand p-4 text-brand-fg">
            <p className="font-display text-lg font-bold">Encontrá tu próxima propiedad</p>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-fg">
              <Rotate3d className="size-5" aria-hidden /> Recorrer en 360°
            </span>
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand font-semibold text-brand-fg">Enviar consulta</span>
            <span className="text-sm font-semibold text-brand-ink">Ver todas →</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Si el color es muy claro o medio, el texto se ajusta solo para que se lea bien.</p>
      </aside>
    </form>
  );
}
