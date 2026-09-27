import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

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
