"use client";

import { Building2, Globe } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cambiarAgencia, crearInmobiliaria, guardarDominio, type EstadoAlta, type EstadoDominio } from "@/lib/admin/acciones-plataforma";
import { slugify } from "@/lib/admin/propiedad";
import { Aviso } from "./ui";

/** Selector de inmobiliaria para quien trabaja en más de una. */
export function SelectorAgencia({ agencias, activa, className }: { agencias: { id: string; nombre: string }[]; activa: string; className?: string }) {
  const id = useId();
  const [cambiando, startTransition] = useTransition();
  if (agencias.length < 2) return null;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block px-1 text-xs font-medium text-muted">
        Inmobiliaria
      </label>
      <Select id={id} value={activa} disabled={cambiando} onChange={(e) => startTransition(() => cambiarAgencia(e.target.value))}>
        {agencias.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Alta de una inmobiliaria: nombre, subdominio, marca básica y el dueño, que recibe la invitación. */
/** `plantillaDireccion` lleva {subdominio}, ej. "https://{subdominio}.inmo360.com.ar". */
export function FormNuevaInmobiliaria({ plantillaDireccion }: { plantillaDireccion: string }) {
  const [estado, accion, enviando] = useActionState<EstadoAlta, FormData>(crearInmobiliaria, {});
  const v = estado.valores ?? {};
  const e = estado.errores ?? {};
  const [subdominio, setSubdominio] = useState(v.subdominio ?? "");
  const [tocado, setTocado] = useState(false);

  return (
    <form action={accion} key={estado.ok ? "nueva" : "editando"} className="flex flex-col gap-4">
      {estado.ok && <Aviso tono="ok">{estado.mensaje}</Aviso>}
      {estado.aviso && <Aviso tono="alerta">{estado.aviso}</Aviso>}
      {e.general && <Aviso tono="error">{e.general}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={e.nombre}>
          {(a) => (
            <Input
              {...a}
              name="nombre"
              defaultValue={v.nombre}
              maxLength={120}
              placeholder="Umbral Propiedades"
              onChange={(ev) => !tocado && setSubdominio(slugify(ev.target.value).slice(0, 40).replace(/-+$/, ""))}
            />
          )}
        </Field>
        <Field label="Subdominio" required error={e.subdominio} hint={subdominio ? `La web queda en ${plantillaDireccion.replace("{subdominio}", subdominio)}` : "Letras minúsculas, números y guiones."}>
          {(a) => (
            <Input
              {...a}
              name="subdominio"
              value={subdominio}
              onChange={(ev) => {
                setTocado(true);
                setSubdominio(ev.target.value.toLowerCase());
              }}
              maxLength={40}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="umbral"
            />
          )}
        </Field>
        <Field label="Color de la marca" error={e.color_primario}>
          {(a) => <Input {...a} name="color_primario" type="color" defaultValue={v.color_primario || "#1f3a5f"} className="h-11 p-1" />}
        </Field>
        <Field label="WhatsApp" error={e.whatsapp} hint="Con código de país, ej. 5491122334455. Se puede cargar después.">
          {(a) => <Input {...a} name="whatsapp" inputMode="tel" defaultValue={v.whatsapp} />}
        </Field>
        <Field label="Email del dueño o responsable" required error={e.email} hint="Recibe una invitación para entrar como administrador." className="sm:col-span-2">
          {(a) => <Input {...a} name="email" type="email" inputMode="email" defaultValue={v.email} placeholder="duenio@umbral.com.ar" />}
        </Field>
      </div>
      <Button type="submit" variant="brand" loading={enviando}>
        {!enviando && <Building2 className="size-4" aria-hidden />} Crear inmobiliaria
      </Button>
    </form>
  );
}

/** Pasos de DNS en lenguaje simple. */
export function InstruccionesDns({ dominio, dns, automatico }: { dominio: string; dns: { a: string; cname: string }; automatico?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 text-sm">
      <p className="font-semibold">Cómo conectar {dominio}</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        {!automatico && (
          <li>
            En <strong>vercel.com</strong>, abrí el proyecto de la plataforma → <strong>Settings</strong> → <strong>Domains</strong> → <strong>Add</strong>. Escribí{" "}
            <code>{dominio}</code> y confirmá. Repetí con <code>www.{dominio}</code> (elegí que redirija a <code>{dominio}</code>).
          </li>
        )}
        <li>
          Entrá al panel donde se administra el DNS del dominio (donde lo compraste, o Cloudflare si lo usás) y creá estos dos registros:
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted">
                  <th className="pr-4 font-medium">Tipo</th>
                  <th className="pr-4 font-medium">Nombre</th>
                  <th className="font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="pr-4">A</td>
                  <td className="pr-4">@</td>
                  <td>{dns.a}</td>
                </tr>
                <tr>
                  <td className="pr-4">CNAME</td>
                  <td className="pr-4">www</td>
                  <td>{dns.cname}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </li>
        <li>
          Si es un <strong>.com.ar</strong> y no tenés dónde cargar registros: en <strong>NIC Argentina</strong> → tu dominio → <strong>Delegaciones</strong>, poné{" "}
          <code>ns1.vercel-dns.com</code> y <code>ns2.vercel-dns.com</code> (en ese caso no hace falta el paso 2).
        </li>
        <li>
          Esperá: suele tardar minutos, a veces hasta 48 horas. Está listo cuando en Vercel → Domains dice <strong>Valid Configuration</strong> y{" "}
          <code>https://{dominio}</code> abre la web.
        </li>
      </ol>
    </div>
  );
}

/** Dominio propio de una inmobiliaria (vacío = solo su subdominio). */
export function FormDominio({ agencyId, actual, dnsActual }: { agencyId: string; actual: string | null; dnsActual: { a: string; cname: string } }) {
  const [estado, accion, enviando] = useActionState<EstadoDominio, FormData>(guardarDominio, {});
  const dominio = estado.ok ? estado.dominio : actual;
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="agencyId" value={agencyId} />
      {estado.mensaje && <Aviso tono="ok">{estado.mensaje}</Aviso>}
      {estado.error && <Aviso tono={estado.ok ? "alerta" : "error"}>{estado.error}</Aviso>}
      <div className="flex gap-2">
        <Field label="Dominio propio (opcional)" className="flex-1">
          {(a) => <Input {...a} name="dominio" defaultValue={actual ?? ""} placeholder="umbralpropiedades.com.ar" autoCapitalize="none" spellCheck={false} />}
        </Field>
        <Button type="submit" variant="outline" loading={enviando} className="self-end">
          {!enviando && <Globe className="size-4" aria-hidden />} Guardar
        </Button>
      </div>
      {dominio && <InstruccionesDns dominio={dominio} dns={estado.dns ?? dnsActual} automatico={estado.automatico} />}
    </form>
  );
}
