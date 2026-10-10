import type { NextRequest } from "next/server";
import { getAgenciaDelPedido } from "@/lib/data/sitio";
import { isSupabaseConfigured } from "@/lib/env";
import { Limitador } from "@/lib/previsita/limite";
import { actualizarLeadDelVisitante, asegurarVisitante, guardarLead, marcarActividad, recalcularLead, registrarEventos } from "@/lib/previsita/servidor";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarLote } from "@/lib/tracking/eventos";

// Límites por instancia: 60 lotes por minuto por IP, 30 por visitante, 20 visitantes nuevos por hora por IP.
const porIp = new Limitador(60, 60_000);
const porVisitante = new Limitador(30, 60_000);
const nuevosPorIp = new Limitador(20, 3_600_000);

const sinContenido = () => new Response(null, { status: 204 });
// "bot/" (Googlebot/2.1, bingbot/2.0…) y no "bot" a secas: hay celulares reales marca Cubot.
const ROBOTS = /bot\/|crawler|spider|Chrome-Lighthouse|HeadlessChrome|Google-InspectionTool|facebookexternalhit|WhatsApp\/|Slackbot/i;

/** Recibe lotes de eventos del navegador (sendBeacon). Nunca bloquea al usuario: ante cualquier problema, 204. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return sinContenido();
  // Global Privacy Control: el navegador pidió no ser rastreado.
  if (request.headers.get("sec-gpc") === "1") return sinContenido();
  // Robots y herramientas de medición (Lighthouse, PageSpeed, vistas previas): no son visitas.
  if (ROBOTS.test(request.headers.get("user-agent") ?? "")) return sinContenido();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  if (!porIp.permitir(ip)) return new Response(null, { status: 429 });

  const texto = await request.text();
  if (texto.length > 32_000) return new Response(null, { status: 413 });
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const validado = validarLote(cuerpo);
  if (!validado || validado.lote.eventos.length === 0) return sinContenido();

  try {
    const agencia = await getAgenciaDelPedido();
    if (!agencia) return sinContenido();
    const db = createAdminClient();
    const tieneCookie = Boolean(request.cookies.get("v360")?.value);
    if (!tieneCookie && !nuevosPorIp.permitir(ip)) return new Response(null, { status: 429 });

    const { visitante } = await asegurarVisitante(db, agencia.id, validado.lote.utm);
    if (!porVisitante.permitir(visitante.id)) return new Response(null, { status: 429 });

    const guardados = await registrarEventos(db, visitante, validado.lote.eventos);
    if (guardados === 0) return sinContenido();
    await marcarActividad(db, visitante);

    // Tocó WhatsApp: lead provisorio con su código de referencia (el mismo del mensaje).
    const whatsapp = validado.lote.eventos.find((e) => e.tipo === "whatsapp_click");
    if (whatsapp) {
      const lead = await guardarLead(db, { visitante, propertyId: whatsapp.propertyId ?? null, origen: "whatsapp_click" });
      await recalcularLead(db, lead);
    } else {
      await actualizarLeadDelVisitante(db, visitante);
    }
  } catch (error) {
    console.error("[eventos]", error instanceof Error ? error.message : error);
  }
  return sinContenido();
}
