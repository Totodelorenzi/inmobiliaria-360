import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlDelPanel } from "@/lib/tenancy";
import type { Enums } from "@/types/database";
import { mensajeError } from "./sesion";

export type ResultadoInvitacion = { ok: true; invitado: boolean } | { ok: false; error: string };

/**
 * Suma a una persona a una inmobiliaria con un rol. Si no tiene cuenta, le llega un mail para crear
 * su contraseña, siempre hacia el panel central. Llamar solo después de verificar los permisos.
 */
export async function sumarPorEmail(email: string, agencyId: string, rol: Enums<"rol_miembro">): Promise<ResultadoInvitacion> {
  const admin = createAdminClient();
  let userId: string | undefined;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${urlDelPanel()}/admin/auth/confirm?next=/admin/nueva-clave`,
  });
  if (data?.user) userId = data.user.id;
  else if (error && /already|registered|exists/i.test(error.message)) {
    // Ya tiene cuenta (por ejemplo, de otra inmobiliaria): solo se la suma a esta.
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = lista?.users.find((u) => u.email?.toLowerCase() === email)?.id;
  } else if (error) {
    return {
      ok: false,
      error: /rate limit/i.test(error.message)
        ? "Se alcanzó el límite de mails por hora de Supabase. Probá más tarde (ver Ayuda)."
        : /not authorized|address not authorized/i.test(error.message)
          ? "El servicio de mails de Supabase solo envía a miembros de tu organización: hace falta configurar un servicio de mails propio (ver docs/SETUP-CUENTAS.md)."
          : "No se pudo enviar la invitación. Revisá el email y probá de nuevo.",
    };
  }
  if (!userId) return { ok: false, error: "No se pudo crear el usuario." };

  const { error: errorMiembro } = await admin
    .from("agency_members")
    .upsert({ user_id: userId, agency_id: agencyId, rol }, { onConflict: "user_id,agency_id" });
  if (errorMiembro) return { ok: false, error: mensajeError(errorMiembro, "No se pudo sumar el usuario a la inmobiliaria.") };
  return { ok: true, invitado: Boolean(data?.user) };
}
