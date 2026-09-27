"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { cambiarClave, iniciarSesion, pedirRecuperacion, type EstadoForm } from "@/app/admin/(acceso)/acciones";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

function Error({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger">
      {texto}
    </p>
  );
}

export function FormLogin({ next, aviso }: { next?: string; aviso?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(iniciarSesion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <Error texto={estado.error ?? aviso} />
      <Field label="Email">
        {(a) => <Input {...a} name="email" type="email" autoComplete="username" inputMode="email" defaultValue={estado.email} required />}
      </Field>
      <Field label="Contraseña">
        {(a) => <Input {...a} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pendiente}>
        Entrar
      </Button>
      <Link href="/admin/recuperar" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-brand-ink underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}

export function FormRecuperar() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(pedirRecuperacion, {});
  if (estado.mensaje) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <CircleCheck className="size-10 text-success" aria-hidden />
        <p>{estado.mensaje}</p>
        <Link href="/admin/login" className="font-semibold text-brand-ink underline">
          Volver a entrar
        </Link>
      </div>
    );
  }
  return (
    <form action={accion} className="flex flex-col gap-4">
      <Error texto={estado.error} />
      <Field label="Email de tu cuenta" hint="Te mandamos un link para elegir una contraseña nueva.">
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={estado.email} required />}
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pendiente}>
        Enviar link
      </Button>
      <Link href="/admin/login" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-brand-ink underline">
        Volver
      </Link>
    </form>
  );
}

export function FormNuevaClave() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(cambiarClave, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <Error texto={estado.error} />
      <Field label="Contraseña nueva" hint="Al menos 10 caracteres, con letras y números.">
        {(a) => <Input {...a} name="password" type="password" autoComplete="new-password" minLength={10} required />}
      </Field>
      <Field label="Repetila">
        {(a) => <Input {...a} name="confirmacion" type="password" autoComplete="new-password" minLength={10} required />}
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pendiente}>
        Guardar contraseña
      </Button>
    </form>
  );
}
