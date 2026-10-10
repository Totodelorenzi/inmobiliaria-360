import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Browser, type Page, type TestInfo } from "@playwright/test";

export { expect, test };

/**
 * Los tests corren contra la inmobiliaria de prueba de la corrida (e2e-<corrida>, con una copia de la
 * demo), creada y borrada entera por global-setup/global-teardown a través de proteccion.ts.
 * Nada de lo que escriben toca la demo ni inmobiliarias reales.
 */
export const corrida = () => process.env.E2E_CORRIDA ?? "local";
export const hayDatos = () => Boolean(process.env.E2E_AGENCIA_ID);

/** Admin de prueba de la corrida (miembro solo de la inmobiliaria de prueba). */
export const adminDePrueba = () => ({ email: process.env.E2E_ADMIN_EMAIL ?? "", clave: process.env.E2E_ADMIN_PASSWORD ?? "" });

let contador = 0;
/** Identificador único por corrida, test y llamada: tests en paralelo nunca usan los mismos datos. */
export const unico = (info: TestInfo) => `${corrida()}-${info.project.name}-${info.workerIndex}-${++contador}`;

/** Navegador nuevo = visitante nuevo (sin cookies de visitante), mismo dispositivo y misma web de prueba. */
export async function visitanteNuevo(browser: Browser, info: TestInfo) {
  const contexto = await browser.newContext(info.project.use);
  return contexto.newPage();
}

/** Slugs de las propiedades de la demo, copiadas tal cual a la inmobiliaria de prueba. */
export const SEED = {
  conTour: "luminoso-3-ambientes-con-balcon-en-palermo",
  casaVenta: "casa-con-galeria-y-jardin-en-vicente-lopez",
  enPozo: "alto-caballito-2-ambientes-en-pozo-con-amenities",
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
