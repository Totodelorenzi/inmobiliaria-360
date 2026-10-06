import type { NextRequest } from "next/server";
import { getAgencia } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { Limitador } from "@/lib/previsita/limite";
import { guardarCookies, idDeCookie, marcarActividad, recalcularLead } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";

const porIp = new Limitador(30, 60_000);

/**
 * Link de pre-visita personalizado: el navegador adopta el visitante creado junto con el link
 * (así todo lo que recorra queda en el lead del prospecto) y va a la ficha.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/v/[codigo]">) {
  const { codigo } = await params;
  const inicio = new URL("/", request.url);
  if (!isSupabaseConfigured() || !/^[a-z0-9]{6,12}$/.test(codigo)) return Response.redirect(inicio, 307);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!porIp.permitir(ip)) return Response.redirect(inicio, 307);

  try {
    const agencia = await getAgencia();
    const db = createAdminClient();
    const { data: link } = await db
      .from("tracked_links")
      .select("id, agency_id, visitor_id, propiedad:properties(slug, publicada)")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!agencia || !link || link.agency_id !== agencia.id || !link.visitor_id || !link.propiedad?.publicada) {
      return Response.redirect(inicio, 307);
    }

    const { data: visitante } = await db
      .from("visitors")
      .select("id, agency_id, codigo_ref, first_seen, tracked_link_id")
      .eq("id", link.visitor_id)
      .single();
    if (!visitante) return Response.redirect(inicio, 307);

    // Si este navegador ya tenía historial anónimo (sin lead), se le pasa al visitante del link.
    const anterior = await idDeCookie();
    if (anterior && anterior !== visitante.id) {
      const { data: leadAnterior } = await db.from("leads").select("id").eq("visitor_id", anterior).maybeSingle();
      if (!leadAnterior) {
        await db.from("visitor_events").update({ visitor_id: visitante.id }).eq("visitor_id", anterior).eq("agency_id", agencia.id);
        await db.from("visitors").delete().eq("id", anterior).eq("agency_id", agencia.id);
      }
    }
    await guardarCookies(visitante);
    await marcarActividad(db, visitante);
    const { data: lead } = await db.from("leads").select("id, visitor_id").eq("visitor_id", visitante.id).maybeSingle();
    if (lead) {
      await db.from("leads").update({ ultima_actividad: new Date().toISOString() }).eq("id", lead.id);
      await recalcularLead(db, lead);
    }
    return Response.redirect(new URL(`/propiedad/${link.propiedad.slug}?utm_source=link_previsita`, request.url), 307);
  } catch (error) {
    console.error("[link]", error instanceof Error ? error.message : error);
    return Response.redirect(inicio, 307);
  }
}
