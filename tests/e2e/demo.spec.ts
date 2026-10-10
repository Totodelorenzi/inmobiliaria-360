import { expect, SEED, test } from "./utiles";

/**
 * Solo lectura sobre la demo real: nunca escribe. Sin formularios ni clics que registren algo, y con
 * Global Privacy Control (Sec-GPC: 1), así el servidor no guarda visitas.
 */
test.use({
  storageState: {
    cookies: [
      { name: "sitio_prueba", value: "horizonte", domain: new URL(process.env.E2E_BASE_URL ?? "http://localhost:3100").hostname, path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" },
    ],
    origins: [],
  },
  extraHTTPHeaders: { "Sec-GPC": "1" },
});

test.describe("demo (solo lectura)", { tag: "@demo" }, () => {
  test("la demo muestra inicio, ficha y tour sin registrar visitas", async ({ page }) => {
    const visitantesCreados: string[] = [];
    page.on("response", async (r) => {
      if (!r.url().includes("/api/eventos")) return;
      const cookies = (await r.headersArray()).filter((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("v360="));
      visitantesCreados.push(...cookies.map((c) => c.value));
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Encontrá tu próxima propiedad" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.goto(`/propiedad/${SEED.conTour}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Luminoso 3 ambientes");
    await page.goto(`/propiedad/${SEED.conTour}/tour`);
    await expect(page.locator(".pnlm-render-container canvas")).toBeAttached();
    await page.goto("about:blank");
    expect(visitantesCreados).toEqual([]);
  });
});
