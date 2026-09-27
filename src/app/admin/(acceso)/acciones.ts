"use server";

import { redirect } from "next/navigation";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { error?: string; mensaje?: string; email?: string };

const NO_CONFIGURADO = "El panel todavía no está conectado a la base de datos (falta configurar Supabase).";

/** Solo rutas internas del panel: evita redirecciones abiertas a otros sitios. */
function destinoSeguro(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/admin") && !n.startsWith("//") ? n : "/admin";
}

export async function iniciarSesion(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá tu email y tu contraseña.", email };
  if (!isSupabaseConfigured()) return { error: NO_CONFIGURADO, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const texto = /invalid login credentials/i.test(error.message)
      ? "Email o contraseña incorrectos."
      : /rate limit|too many/i.test(error.message)
        ? "Demasiados intentos. Esperá unos minutos y probá de nuevo."
        : /email not confirmed/i.test(error.message)
          ? "Todavía no confirmaste tu email. Buscá el mail de invitación."
          : "No pudimos iniciar sesión. Probá de nuevo.";
    return { error: texto, email };
  }
  redirect(destinoSeguro(formData.get("next")));
}

export async function pedirRecuperacion(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Escribí un email válido.", email };
  if (!isSupabaseConfigured()) return { error: NO_CONFIGURADO, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/admin/auth/confirm?next=/admin/nueva-clave`,
  });
  if (error && /rate limit|too many|seconds/i.test(error.message)) {
    return { error: "Ya te mandamos un mail hace muy poco. Esperá unos minutos antes de pedir otro.", email };
  }
  // Mismo mensaje exista o no la cuenta: no revela qué emails están registrados.
  return { mensaje: "Si el email corresponde a una cuenta del panel, te llega un link para elegir una contraseña nueva. Revisá también la carpeta de spam." };
}

export async function cambiarClave(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const clave = String(formData.get("password") ?? "");
  const repetida = String(formData.get("confirmacion") ?? "");
  if (clave.length < 10 || !/[a-zA-Z]/.test(clave) || !/\d/.test(clave)) {
    return { error: "La contraseña tiene que tener al menos 10 caracteres, con letras y números." };
  }
  if (clave !== repetida) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) {
    return {
      error: /same|different/i.test(error.message)
        ? "La contraseña nueva tiene que ser distinta de la anterior."
        : "No pudimos cambiar la contraseña. Si el link venció, pedí uno nuevo.",
    };
  }
  redirect("/admin?aviso=clave-ok");
}

export async function cerrarSesion() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
