import { expect, test } from "@playwright/test";
import { revisarAccesibilidad, SEED } from "./utiles";

test.describe("web pública", { tag: "@con-datos" }, () => {
  test("inicio: buscador, secciones y tarjetas", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Encontrá tu próxima propiedad" })).toBeVisible();
    for (const seccion of ["En alquiler", "En venta", "Emprendimientos en construcción"]) {
      await expect(page.getByRole("heading", { name: seccion })).toBeVisible();
    }
    await expect(page.getByRole("article").first()).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("buscar desde el inicio lleva al listado filtrado", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Venta", { exact: true }).first().click();
    await page.getByRole("searchbox", { name: /barrio, calle o tipo/i }).fill("vicente lopez");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/venta\?q=vicente/);
    await expect(page.getByRole("link", { name: /Casa con galería y jardín/ })).toBeVisible();
  });

  test("filtros sincronizados con la URL", async ({ page, isMobile }) => {
    await page.goto("/venta");
    if (isMobile) {
      await page.getByRole("button", { name: /^Filtros/ }).click();
      const dialogo = page.getByRole("dialog", { name: "Filtros" });
      await dialogo.getByLabel("Tipo de propiedad").selectOption("casa");
      await dialogo.getByRole("button", { name: "Ver resultados" }).click();
    } else {
      await page.getByRole("complementary", { name: "Filtros" }).getByLabel("Tipo de propiedad").selectOption("casa");
    }
    await expect(page).toHaveURL(/tipo=casa/);
    await expect(page.getByRole("link", { name: /Casa con galería y jardín/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /3 ambientes con cochera en Belgrano/ })).toHaveCount(0);
  });

  test("ficha: precio, tour, WhatsApp, datos estructurados y accesibilidad", async ({ page }) => {
    await page.goto(`/propiedad/${SEED.conTour}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Luminoso 3 ambientes");
    await expect(page.getByText("$ 1.150.000/mes").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Recorrer la propiedad en 360°" })).toBeVisible();
    const whatsapp = page.getByRole("link", { name: "Consultar por WhatsApp" }).first();
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(jsonLd["@type"]).toBe("RealEstateListing");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`/og/propiedad/${SEED.conTour}`));
    await revisarAccesibilidad(page, [".leaflet-container"]);
  });

  test("imagen para compartir generada", async ({ request }) => {
    const r = await request.get(`/og/propiedad/${SEED.conTour}`);
    expect(r.ok()).toBe(true);
    expect(r.headers()["content-type"]).toContain("image/png");
  });

  test("formulario de consulta guarda el lead", async ({ page }) => {
    await page.goto(`/propiedad/${SEED.casaVenta}`);
    const form = page.getByRole("complementary", { name: "Consultá por esta propiedad" });
    await form.getByLabel("Nombre").fill("Prueba automática");
    await form.getByLabel("Teléfono").fill("11 2233-4455");
    await form.getByRole("button", { name: "Enviar consulta" }).click();
    await expect(page.getByText("¡Gracias por tu consulta!")).toBeVisible();
  });

  test("tour 360°: carga, miniaturas y link compartible por ambiente", async ({ page }) => {
    await page.goto(`/propiedad/${SEED.conTour}/tour`);
    await expect(page.locator(".pnlm-render-container canvas")).toBeAttached();
    const ambientes = page.getByRole("navigation", { name: "Ambientes" }).getByRole("button");
    await expect(ambientes).toHaveCount(4);
    await ambientes.filter({ hasText: "Cocina" }).click();
    await expect(page).toHaveURL(/\?escena=/);
    await expect(page.getByText("Cocina", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Cerrar y volver a la propiedad" })).toHaveAttribute("href", `/propiedad/${SEED.conTour}`);
  });

  test("planos: puntos, zoom y selector de planos", async ({ page }) => {
    await page.goto(`/propiedad/${SEED.enPozo}/planos`);
    await expect(page.getByText("Cargando plano…")).toHaveCount(0);
    await page.getByRole("button", { name: "Dormitorio" }).click();
    await expect(page.getByRole("dialog", { name: "Dormitorio" })).toBeVisible();
    await page.getByRole("button", { name: "Acercar" }).click();
    await expect(page.getByRole("button", { name: "Alejar" })).toBeEnabled();
    await page.getByRole("button", { name: "Terraza de amenities" }).click();
    await expect(page.getByRole("button", { name: "Pileta" })).toBeVisible();
  });
});
