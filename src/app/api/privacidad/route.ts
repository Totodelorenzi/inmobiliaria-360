import { cookies } from "next/headers";
import { getAgenciaDelPedido } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { COOKIE_REF, COOKIE_VISITANTE, idDeCookie } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Borra el historial de navegación de este navegador (visitante + eventos) y sus cookies.
 * Los datos de contacto que la persona dejó se borran a pedido por los canales de /privacidad.
 */
export async function POST() {
  const id = await idDeCookie();
  if (id && isSupabaseConfigured()) {
    const agencia = await getAgenciaDelPedido();
    if (agencia) {
      const { error } = await createAdminClient().from("visitors").delete().eq("id", id).eq("agency_id", agencia.id);
      if (error) return Response.json({ ok: false }, { status: 500 });
    }
  }
  const jar = await cookies();
  jar.delete(COOKIE_VISITANTE);
  jar.delete(COOKIE_REF);
  return Response.json({ ok: true });
}
