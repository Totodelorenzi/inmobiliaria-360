/**
 * Carga el tema de un cliente (docs/clientes/<slug>/tema.json, armado con la skill
 * web-inmobiliaria-cliente) en su fila de agencies. Antes revisa el contraste: si algún par no
 * llega a AA, no guarda nada.
 *   npm run tema -- <subdominio>            (lee docs/clientes/<subdominio>/tema.json)
 *   npm run tema -- <subdominio> --probar    (solo revisa, no guarda)
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { FAMILIAS, leerTema, problemasDeContraste } from "@/lib/tema";

async function main() {
  const [subdominio, bandera] = process.argv.slice(2);
  if (!subdominio) throw new Error("Uso: npm run tema -- <subdominio> [--probar]");
  const ruta = join(import.meta.dirname, "..", "docs", "clientes", subdominio, "tema.json");
  const crudo = JSON.parse(await readFile(ruta, "utf8")) as Record<string, unknown>;
  const tema = leerTema(crudo);

  const tipo = (crudo.tipografia ?? {}) as Record<string, { familia?: string } | undefined>;
  for (const rol of ["display", "texto"] as const) {
    const pedida = tipo[rol]?.familia;
    if (pedida && !tema.tipografia[rol]) throw new Error(`La familia "${pedida}" no está en el catálogo (src/lib/fuentes.ts): ${FAMILIAS.join(", ")}.`);
  }
  const problemas = problemasDeContraste(tema);
  if (problemas.length) throw new Error(`Contraste insuficiente, no se guardó:\n- ${problemas.join("\n- ")}`);
  console.log("• Contraste AA: todos los pares pasan.");
  if (bandera === "--probar") return;

  const db = createAdminClient();
  const { data, error } = await db.from("agencies").update({ tema: crudo as never }).eq("subdominio", subdominio).select("nombre").maybeSingle();
  if (error) throw new Error(`No se pudo guardar el tema: ${error.message}`);
  if (!data) throw new Error(`No hay ninguna inmobiliaria con subdominio "${subdominio}".`);
  console.log(`• Tema guardado en ${data.nombre}. La web lo muestra en menos de una hora, o enseguida si se guarda la Configuración en el panel.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
