/**
 * Carga las imágenes reales de demo-mirador/ en el Edificio Mirador ya creado, sin tocar
 * unidades, estados, polígonos ni leads.
 *   npm run imagenes:mirador
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarImagenesMirador, CARPETA_MIRADOR, DESARROLLADORA_DEMO_ID, hayImagenesMirador } from "./seed/imagenes-mirador.ts";

async function main() {
  if (!hayImagenesMirador()) throw new Error(`No hay imágenes en ${CARPETA_MIRADOR}`);
  const db = createAdminClient();
  const { data: proyecto, error } = await db.from("projects").select("id").eq("agency_id", DESARROLLADORA_DEMO_ID).eq("es_demo", true).maybeSingle();
  if (error || !proyecto) throw new Error("No está el Edificio Mirador: corré antes npm run seed:desarrolladora");
  const { subidas, faltan } = await aplicarImagenesMirador(db, DESARROLLADORA_DEMO_ID, proyecto.id, (t) => console.log(`• ${t}`));
  console.log(`\nListo: ${subidas} imágenes.${faltan.length ? ` Faltan: ${faltan.join(", ")}.` : ""}`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
