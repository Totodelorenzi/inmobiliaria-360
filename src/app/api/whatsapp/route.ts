import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Registra un click en "Consultar por WhatsApp" como lead. Siempre responde 204: nunca bloquea al usuario. */
export async function POST(request: Request) {
  try {
    const { agencyId, propertyId } = JSON.parse(await request.text()) as { agencyId?: unknown; propertyId?: unknown };
    const valido =
      typeof agencyId === "string" &&
      UUID.test(agencyId) &&
      (propertyId == null || (typeof propertyId === "string" && UUID.test(propertyId)));

    if (valido && isSupabaseConfigured()) {
      const { error } = await createPublicClient({ cache: false })
        .from("leads")
        .insert({ agency_id: agencyId, property_id: (propertyId as string | null) ?? null, origen: "whatsapp_click" });
      if (error) console.error("[whatsapp] no se pudo registrar el click:", error.message);
    }
  } catch {
    // Cuerpo inválido: se ignora.
  }
  return new Response(null, { status: 204 });
}
