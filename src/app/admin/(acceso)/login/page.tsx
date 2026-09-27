import type { Metadata } from "next";
import { FormLogin } from "@/components/admin/forms-acceso";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  link: "El link venció o ya se usó. Pedí uno nuevo desde “¿Olvidaste tu contraseña?”.",
  sesion: "Tu sesión venció. Volvé a entrar.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next, error } = await searchParams;
  const aviso = !isSupabaseConfigured()
    ? "El panel todavía no está conectado a la base de datos. Seguí la guía docs/SETUP-CUENTAS.md."
    : typeof error === "string"
      ? AVISOS[error]
      : undefined;
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Entrar al panel</h1>
      <FormLogin next={typeof next === "string" ? next : undefined} aviso={aviso} />
    </>
  );
}
