import { expect, test } from "@playwright/test";
import { hayDatos, revisarAccesibilidad } from "./utiles";

test.describe("rutas y seguridad básicas", { tag: "@sin-datos" }, () => {
  test("el panel exige iniciar sesión", async ({ page }) => {
    await page.goto("/admin/propiedades");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Entrar al panel" })).toBeVisible();
  });

  test("login: no se envía con campos vacíos", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    const faltaEmail = await page.getByLabel("Email").evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
    expect(faltaEmail).toBe(true);
  });

  test("login accesible y con botones de al menos 44 px", async ({ page }) => {
    await page.goto("/admin/login");
    await revisarAccesibilidad(page);
    const alto = (await page.getByRole("button", { name: "Entrar" }).boundingBox())?.height ?? 0;
    expect(alto).toBeGreaterThanOrEqual(44);
  });

  test("página inexistente responde 404", async ({ page }) => {
    const respuesta = await page.goto("/esta-pagina-no-existe");
    expect(respuesta?.status()).toBe(404);
    if (hayDatos()) await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  });

  test("robots.txt bloquea el panel y apunta al sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/alquiler");
  });

  test("el buscador funciona sin JavaScript", async ({ request }) => {
    const r = await request.get("/buscar?operacion=venta&q=palermo", { maxRedirects: 0 });
    expect(r.status()).toBe(303);
    expect(r.headers()["location"]).toMatch(/\/venta\?q=palermo$/);
  });

  test("sin Supabase muestra el aviso de configuración", async ({ page }) => {
    test.skip(hayDatos(), "Supabase está configurado");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sitio en configuración" })).toBeVisible();
  });
});
