import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type BrowserContext, type Page, type Response } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export { expect };

/**
 * Cada navegador de prueba queda registrado como visitante (y algunos tests dejan leads).
 * Al terminar cada test se borra exactamente lo suyo: los visitantes de sus cookies `v360`,
 * con sus leads y links. Nunca toca datos de ejemplo; sin clave secreta no hace nada.
 */
const visitantes = new Set<string>();

/** Anota el visitante de un contexto que el test cierra antes de terminar. */
export async function anotarVisitante(contexto: BrowserContext) {
  for (const c of await contexto.cookies()) if (c.name === "v360") visitantes.add(c.value);
}

async function borrarVisitantes() {
  const ids = [...visitantes];
  visitantes.clear();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!ids.length || !url || !clave || clave.includes("PLACEHOLDER")) return;
  const db = createClient(url, clave, { auth: { persistSession: false } });
  for (const tabla of ["leads", "tracked_links"] as const) {
    const { error } = await db.from(tabla).delete().in("visitor_id", ids).eq("es_demo", false);
    if (error) throw new Error(`Limpieza E2E (${tabla}): ${error.message}`);
  }
  const { error } = await db.from("visitors").delete().in("id", ids).eq("es_demo", false);
  if (error) throw new Error(`Limpieza E2E (visitors): ${error.message}`);
}

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** Visitantes que asignó el servidor en una respuesta (dos envíos seguidos sin cookie crean dos). */
async function anotarRespuesta(respuesta: Response | null) {
  for (const h of (await respuesta?.headersArray()) ?? []) {
    const id = h.name.toLowerCase() === "set-cookie" && /^v360=([0-9a-f-]{36})/i.exec(h.value)?.[1];
    if (id) visitantes.add(id);
  }
}

export const test = base.extend<{ limpiarVisitantes: void }>({
  limpiarVisitantes: [
    async ({ context }, use) => {
      // Se espera a cada envío de eventos: uno que llegue después del borrado crearía otro visitante.
      // Con tope: la respuesta a un beacon de una página que ya se fue puede no llegar nunca.
      const envios: Promise<unknown>[] = [];
      context.on("request", (r) => {
        if (r.url().includes("/api/eventos")) envios.push(Promise.race([r.response().then(anotarRespuesta).catch(() => null), esperar(5000)]));
      });
      await use();
      // Salir de las páginas dispara el envío de lo pendiente (pagehide).
      for (const pagina of context.pages()) await pagina.goto("about:blank").catch(() => null);
      await esperar(500);
      await Promise.all(envios);
      await anotarVisitante(context);
      await borrarVisitantes();
    },
    { auto: true },
  ],
});

/** Slugs de las propiedades del seed (scripts/seed/datos.ts). */
export const SEED = {
  conTour: "luminoso-3-ambientes-con-balcon-en-palermo",
  casaVenta: "casa-con-galeria-y-jardin-en-vicente-lopez",
  enPozo: "alto-caballito-2-ambientes-en-pozo-con-amenities",
};

export const hayDatos = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return Boolean(process.env.E2E_BASE_URL) || (url !== "" && !url.includes("PLACEHOLDER"));
};

/** Accesibilidad WCAG 2.x A/AA: sin problemas graves ni críticos. */
export async function revisarAccesibilidad(page: Page, excluir: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  for (const selector of excluir) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();
  const graves = violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(graves, graves.join("\n")).toEqual([]);
}
