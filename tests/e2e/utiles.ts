import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Browser, type BrowserContext, type Page, type Response, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { borrarCarpetaPropiedad } from "../../src/lib/admin/storage";
import type { Database } from "../../src/types/database";

export { expect };

/**
 * Limpieza: cada navegador de prueba queda registrado como visitante, y algunos tests dejan leads o
 * propiedades. Al terminar cada test, aunque falle, se borra exactamente lo suyo: los visitantes de
 * sus cookies `v360` y de las respuestas del servidor (con sus leads y links) y las propiedades
 * "Prueba E2E <dispositivo> …" con sus archivos. Nunca toca datos de ejemplo; sin clave secreta no hace nada.
 */
export const TITULO_PRUEBA = "Prueba E2E";
const visitantes = new Set<string>();
const contextos = new Set<BrowserContext>();
let envios: Promise<unknown>[] = [];

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** Visitantes que asignó el servidor en una respuesta (dos envíos seguidos sin cookie crean dos). */
async function anotarRespuesta(respuesta: Response | null) {
  for (const h of (await respuesta?.headersArray()) ?? []) {
    const id = h.name.toLowerCase() === "set-cookie" && /^v360=([0-9a-f-]{36})/i.exec(h.value)?.[1];
    if (id) visitantes.add(id);
  }
}

/** Sigue los envíos de eventos de un contexto. Con tope: el de un beacon de una página que ya se fue puede no responder nunca. */
function seguir(contexto: BrowserContext) {
  contextos.add(contexto);
  contexto.on("request", (r) => {
    if (r.url().includes("/api/eventos")) envios.push(Promise.race([r.response().then(anotarRespuesta).catch(() => null), esperar(5000)]));
  });
}

/** Anota el visitante de un contexto (llamar antes de cerrarlo). */
export async function anotarVisitante(contexto: BrowserContext) {
  for (const c of await contexto.cookies().catch(() => [])) if (c.name === "v360") visitantes.add(c.value);
}

/** Navegador nuevo = visitante nuevo (sin cookies), con el mismo dispositivo del proyecto. */
export async function visitanteNuevo(browser: Browser, info: TestInfo) {
  const contexto = await browser.newContext(info.project.use);
  seguir(contexto);
  return contexto.newPage();
}

async function limpiar(dispositivo: string) {
  // Salir de las páginas dispara el envío de lo pendiente (pagehide); se espera a cada envío:
  // uno que llegue después del borrado crearía otro visitante.
  for (const contexto of contextos) for (const pagina of contexto.pages()) await pagina.goto("about:blank").catch(() => null);
  await esperar(500);
  await Promise.all(envios);
  for (const contexto of contextos) await anotarVisitante(contexto);
  const ids = [...visitantes];
  visitantes.clear();
  contextos.clear();
  envios = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave || clave.includes("PLACEHOLDER")) return;
  const db = createClient<Database>(url, clave, { auth: { persistSession: false } });
  const fallar = (que: string, error: { message: string } | null) => {
    if (error) throw new Error(`Limpieza E2E (${que}): ${error.message}`);
  };
  if (ids.length) {
    for (const tabla of ["leads", "tracked_links"] as const) {
      fallar(tabla, (await db.from(tabla).delete().in("visitor_id", ids).eq("es_demo", false)).error);
    }
    fallar("visitors", (await db.from("visitors").delete().in("id", ids).eq("es_demo", false)).error);
  }
  // Solo las de este dispositivo: el otro corre en paralelo su propia alta.
  const { data: propiedades, error } = await db
    .from("properties")
    .select("id, agency_id")
    .like("titulo", `${TITULO_PRUEBA} ${dispositivo} %`)
    .eq("es_demo", false);
  fallar("properties", error);
  for (const p of propiedades ?? []) {
    await borrarCarpetaPropiedad(db, p.agency_id, p.id);
    fallar("properties", (await db.from("properties").delete().eq("id", p.id)).error);
  }
}

export const test = base.extend<{ limpieza: void }>({
  limpieza: [
    async ({ context }, use, info) => {
      seguir(context);
      await use();
      await limpiar(info.project.name);
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
