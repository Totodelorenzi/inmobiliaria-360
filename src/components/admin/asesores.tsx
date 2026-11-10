"use client";

import { ImagePlus, Pencil, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { eliminarAsesor, guardarAsesor, type EstadoAsesor } from "@/lib/admin/acciones-asesores";
import { procesarLogo } from "@/lib/admin/imagenes";
import { subirArchivo } from "@/lib/admin/subida";
import type { Tables } from "@/types/database";
import { BotonConfirmar, MostrarAviso, useAccion } from "./acciones-ui";
import { Aviso } from "./ui";

type Asesor = Tables<"advisors">;

/** Formulario de alta o edición (con `asesor`, edita). */
export function FormAsesor({ asesor, agencyId, alTerminar }: { asesor?: Asesor; agencyId: string; alTerminar?: () => void }) {
  const router = useRouter();
  const [foto, setFoto] = useState(asesor?.foto_url ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion, guardando] = useActionState<EstadoAsesor, FormData>(async (prev, datos) => {
    const r = await guardarAsesor(prev, datos);
    if (r.ok) {
      if (!asesor) {
        formRef.current?.reset();
        setFoto("");
      }
      router.refresh();
      alTerminar?.();
    }
    return r;
  }, {});
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const e = estado.errores ?? {};

  async function subirFoto(archivo: File) {
    setSubiendo(true);
    setErrorFoto(null);
    try {
      const { blob, extension } = await procesarLogo(archivo);
      setFoto(await subirArchivo({ bucket: "fotos", ruta: `${agencyId}/asesores/${crypto.randomUUID().slice(0, 12)}.${extension}`, archivo: blob }));
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form ref={formRef} action={accion} className="flex flex-col gap-4">
      {e.general && <Aviso tono="error">{e.general}</Aviso>}
      {estado.ok && estado.mensaje && <Aviso tono="ok">{estado.mensaje}</Aviso>}
      {asesor && <input type="hidden" name="id" value={asesor.id} />}
      <input type="hidden" name="foto_url" value={foto} />
      <div className="flex flex-wrap items-center gap-3">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto subida
          <img src={foto} alt="Foto del asesor" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-surface text-muted" aria-hidden>
            <UserRound className="size-8" />
          </span>
        )}
        <Button variant="outline" onClick={() => fotoRef.current?.click()} disabled={subiendo}>
          {subiendo ? <Spinner className="size-4" /> : <ImagePlus className="size-4" aria-hidden />} {foto ? "Cambiar foto" : "Subir foto"}
        </Button>
        {foto && (
          <Button variant="ghost" onClick={() => setFoto("")}>
            Quitar
          </Button>
        )}
        <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(ev) => ev.target.files?.[0] && subirFoto(ev.target.files[0])} />
      </div>
      {errorFoto && <p className="text-sm text-danger">{errorFoto}</p>}
      <p className="-mt-2 text-sm text-muted">Una foto real, de frente y con buena luz. Nada de fotos de stock.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" required error={e.nombre}>
          {(a) => <Input {...a} name="nombre" defaultValue={asesor?.nombre ?? ""} maxLength={120} required />}
        </Field>
        <Field label="Rol" hint="Ej. Asesora comercial, Martillero.">
          {(a) => <Input {...a} name="rol" defaultValue={asesor?.rol ?? ""} maxLength={60} />}
        </Field>
        <Field label="WhatsApp" error={e.whatsapp} hint="Recibe las consultas de sus propiedades.">
          {(a) => <Input {...a} name="whatsapp" defaultValue={asesor?.whatsapp ?? ""} inputMode="tel" placeholder="221 456-7890" />}
        </Field>
        <Field label="Teléfono (opcional)">
          {(a) => <Input {...a} name="telefono" defaultValue={asesor?.telefono ?? ""} inputMode="tel" />}
        </Field>
        <Field label="Email (opcional)" error={e.email}>
          {(a) => <Input {...a} name="email" type="email" defaultValue={asesor?.email ?? ""} />}
        </Field>
        <Field label="Matrícula (opcional)" hint="Tal como querés que se vea en la web.">
          {(a) => <Input {...a} name="matricula" defaultValue={asesor?.matricula ?? ""} maxLength={120} />}
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="activo" defaultChecked={asesor?.activo ?? true} className="size-5 accent-(--brand)" />
        <span className="font-medium">Activo (se muestra en la web)</span>
      </label>
      <Button type="submit" variant="brand" loading={guardando} disabled={subiendo} className="self-start">
        {asesor ? "Guardar cambios" : "Agregar asesor"}
      </Button>
    </form>
  );
}

export function ListaAsesores({ asesores, agencyId }: { asesores: Asesor[]; agencyId: string }) {
  const [editando, setEditando] = useState<string | null>(null);
  const { ejecutar, pendiente, aviso } = useAccion();

  if (asesores.length === 0) return <p className="text-muted">Todavía no hay asesores. Sin asesor, las consultas van al WhatsApp de la inmobiliaria.</p>;

  return (
    <div className="flex flex-col gap-3">
      <MostrarAviso aviso={aviso} />
      <ul className="flex flex-col divide-y divide-border" aria-busy={pendiente}>
        {asesores.map((a) => (
          <li key={a.id} className="py-3">
            <div className="flex items-center gap-3">
              {a.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto chica de Storage
                <img src={a.foto_url} alt="" className="size-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-muted" aria-hidden>
                  <UserRound className="size-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {a.nombre} {!a.activo && <span className="text-sm font-normal text-muted">(inactivo)</span>}
                </p>
                <p className="truncate text-sm text-muted">{[a.rol, a.whatsapp ? `WhatsApp ${a.whatsapp}` : "Sin WhatsApp", a.matricula].filter(Boolean).join(" — ")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditando(editando === a.id ? null : a.id)} aria-label={`Editar a ${a.nombre}`} aria-expanded={editando === a.id}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <BotonConfirmar
                variant="ghost"
                size="icon"
                aria-label={`Quitar a ${a.nombre}`}
                titulo={`¿Quitar a ${a.nombre}?`}
                descripcion="Sus propiedades quedan sin asesor y las consultas van al WhatsApp de la inmobiliaria."
                confirmar="Quitar"
                onConfirmar={() => ejecutar(() => eliminarAsesor(a.id))}
              >
                <Trash2 className="size-4 text-danger" aria-hidden />
              </BotonConfirmar>
            </div>
            {editando === a.id && (
              <div className="mt-4 rounded-xl border border-border p-4">
                <FormAsesor asesor={a} agencyId={agencyId} alTerminar={() => setEditando(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
