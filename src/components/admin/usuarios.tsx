"use client";

import { Send, UserMinus } from "lucide-react";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cambiarRol, invitarUsuario, quitarUsuario } from "@/lib/admin/acciones-agencia";
import type { Resultado } from "@/lib/admin/sesion";
import { BotonConfirmar, MostrarAviso, useAccion } from "./acciones-ui";
import { Aviso } from "./ui";

export type Miembro = { userId: string; email: string; rol: "admin" | "agente"; pendiente: boolean };

export function FormInvitar() {
  const [estado, accion, enviando] = useActionState<Resultado | null, FormData>(invitarUsuario, null);
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado && (estado.ok ? <Aviso tono="ok">{estado.mensaje}</Aviso> : <Aviso tono="error">{estado.error}</Aviso>)}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <Field label="Email">
          {(a) => <Input {...a} key={estado?.ok ? "limpio" : "igual"} name="email" type="email" inputMode="email" required placeholder="agente@tuinmobiliaria.com" />}
        </Field>
        <Field label="Rol">
          {(a) => (
            <Select {...a} name="rol" defaultValue="agente">
              <option value="agente">Agente</option>
              <option value="admin">Administrador</option>
            </Select>
          )}
        </Field>
      </div>
      <Button type="submit" variant="brand" loading={enviando}>
        {!enviando && <Send className="size-4" aria-hidden />} Enviar invitación
      </Button>
      <p className="text-sm text-muted">
        <strong>Agente:</strong> carga y edita propiedades y ve las consultas. <strong>Administrador:</strong> además cambia la configuración y los usuarios.
      </p>
    </form>
  );
}

export function ListaMiembros({ miembros, yo }: { miembros: Miembro[]; yo: string }) {
  const { ejecutar, pendiente, aviso } = useAccion();
  return (
    <div className="flex flex-col gap-3">
      <MostrarAviso aviso={aviso} />
      <ul className="divide-y divide-border" aria-busy={pendiente}>
        {miembros.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.email}</p>
              <div className="mt-1 flex gap-1.5">
                {m.userId === yo && <Badge tone="brand">Vos</Badge>}
                {m.pendiente && <Badge tone="warning">Invitación pendiente</Badge>}
              </div>
            </div>
            {m.userId === yo ? (
              <span className="text-sm text-muted">{m.rol === "admin" ? "Administrador" : "Agente"}</span>
            ) : (
              <>
                <Select
                  value={m.rol}
                  onChange={(e) => ejecutar(() => cambiarRol(m.userId, e.target.value as Miembro["rol"]))}
                  aria-label={`Rol de ${m.email}`}
                  className="w-auto"
                  disabled={pendiente}
                >
                  <option value="agente">Agente</option>
                  <option value="admin">Administrador</option>
                </Select>
                <BotonConfirmar
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar a ${m.email}`}
                  titulo={`¿Quitar a ${m.email}?`}
                  descripcion="Va a dejar de poder entrar al panel de esta inmobiliaria. Sus propiedades cargadas no se borran."
                  confirmar="Quitar"
                  onConfirmar={() => ejecutar(() => quitarUsuario(m.userId))}
                >
                  <UserMinus className="size-4 text-danger" aria-hidden />
                </BotonConfirmar>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
