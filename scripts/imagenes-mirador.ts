/**
 * Carga las imágenes reales de demo-mirador-2/ en el Edificio Mirador ya creado, sin tocar
 * unidades, estados, zonas ni leads (ver los nombres en scripts/seed/mirador/reales.ts).
 *   npm run imagenes:mirador                  → todas las que estén en la carpeta
 *   npm run imagenes:mirador -- vista-1 t3     → solo las que empiezan así
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarImagenesReales, CARPETA_REALES, DESARROLLADORA_DEMO_ID, hayImagenesReales } from "./seed/mirador/reales.ts";

async function main() {
  if (!hayImagenesReales()) throw new Error(`No hay imágenes en ${CARPETA_REALES}`);
  const db = createAdminClient();
  const { data: proyecto, error } = await db.from("projects").select("id").eq("agency_id", DESARROLLADORA_DEMO_ID).eq("slug", "edificio-mirador").maybeSingle();
  if (error || !proyecto) throw new Error("No encontré el Edificio Mirador: corré primero npm run seed:desarrolladora");
  const { subidas, faltan } = await aplicarImagenesReales(db, DESARROLLADORA_DEMO_ID, proyecto.id, (t) => console.log(`• ${t}`), process.argv.slice(2));
  console.log(`\nListo: ${subidas} imágenes subidas.${faltan.length ? ` Faltan: ${faltan.join(", ")}.` : ""}`);
  console.log("Si una planta o una fachada cambió de encuadre, revisá sus zonas en el panel (Zonas).");
}

main().catch((e: unknown) => {
  console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
