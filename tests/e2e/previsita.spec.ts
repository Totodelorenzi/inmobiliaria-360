import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { revisarAccesibilidad, SEED } from "./utiles";

async function entrarAlPanel(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Navegador nuevo = visitante nuevo (sin cookies de pre-visita), con el mismo dispositivo del proyecto. */
async function visitanteNuevo(browser: Browser, info: TestInfo) {
  const contexto = await browser.newContext(info.project.use);
  return contexto.newPage();
}

test.describe("pre-visita en la web pública", { tag: "@con-datos" }, () => {
  test("WhatsApp lleva el código de referencia del visitante", async ({ page, context }) => {
    await context.route("https://wa.me/**", (ruta) => ruta.abort());
    await page.goto(`/propiedad/${SEED.casaVenta}`);
    // La primera vista crea el visitante y deja la cookie con el código.
    await expect.poll(async () => (await context.cookies()).some((c) => c.name === "v360_ref")).toBe(true);
    const popup = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Consultar por WhatsApp" }).first().click();
    expect(decodeURIComponent((await popup).url())).toMatch(/Ref\. [A-Z0-9]{4,6}/);
  });

  test("pedido de visita: valida antes de enviar", async ({ page }) => {
    await page.goto(`/propiedad/${SEED.casaVenta}`);
    await page.getByRole("button", { name: "Pedir visita presencial" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Pedir visita presencial" });
    await expect(dialogo.getByText("¿Cómo pensás pagar?")).toBeVisible();
    await expect(dialogo.getByText("¿Necesitás vender otra propiedad para comprar?")).toBeVisible();
    await dialogo.getByRole("button", { name: "Pedir visita" }).click();
    await expect(dialogo.getByRole("alert").first()).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test("privacidad: aviso de primera visita y página con la ley", async ({ page }) => {
    await page.goto("/");
    const aviso = page.getByRole("complementary", { name: "Aviso de privacidad" });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: /Entendido/ }).click();
    await page.reload();
    await expect(aviso).toHaveCount(0);
    await page.goto("/privacidad");
    await expect(page.getByRole("heading", { level: 1, name: "Privacidad" })).toBeVisible();
    await expect(page.getByText(/Ley N° 25\.326/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Borrar mi historial/ })).toBeVisible();
  });
});

test.describe("circuito completo de pre-visita", { tag: "@admin" }, () => {
  test.describe.configure({ mode: "serial" });

  test("recorre el tour completo, pide visita y el lead aparece con puntaje e historial", async ({ page, browser }, info) => {
    test.setTimeout(300_000);
    const nombre = `E2E Visita ${info.project.name} ${Date.now()}`;
    const visitante = await visitanteNuevo(browser, info);

    // 1. Tour completo: todas las escenas y más de 60 s visibles (ver src/lib/tracking/config.ts).
    await visitante.goto(`/propiedad/${SEED.conTour}/tour`);
    await expect(visitante.locator(".pnlm-render-container canvas")).toBeAttached();
    const ambientes = visitante.getByRole("navigation", { name: "Ambientes" }).getByRole("button");
    const cantidad = await ambientes.count();
    for (let i = 0; i < cantidad; i++) {
      await ambientes.nth(i).click();
      await expect(visitante.getByText(/^Cargando/)).toHaveCount(0, { timeout: 30_000 });
      await visitante.waitForTimeout(Math.ceil(66_000 / cantidad));
    }
    await expect(visitante.getByText("¡Recorriste toda la propiedad!")).toBeVisible({ timeout: 20_000 });

    // 2. Pedido de visita desde el aviso de tour completo (propiedad en alquiler: plazo y franja).
    await visitante.getByRole("status").filter({ hasText: "¡Recorriste toda la propiedad!" }).getByRole("button", { name: "Pedir visita" }).click();
    const dialogo = visitante.getByRole("dialog", { name: "Pedir visita presencial" });
    await dialogo.getByText("Lo antes posible").click();
    await dialogo.getByText("Tarde", { exact: true }).click();
    await dialogo.getByLabel("Nombre").fill(nombre);
    await dialogo.getByLabel("Teléfono").fill("11 0000-9999");
    await dialogo.getByRole("checkbox").check();
    await dialogo.getByRole("button", { name: "Pedir visita" }).click();
    await expect(dialogo.getByText("¡Listo! Te vamos a contactar para coordinar la visita.")).toBeVisible();
    const codigo = (await dialogo.locator("strong.font-mono").textContent())!.trim();
    await visitante.context().close();

    // 3. En el panel: lead con puntaje, porqué y línea de tiempo.
    await entrarAlPanel(page);
    await page.goto(`/admin/leads?q=${codigo}`);
    await page.getByRole("link", { name: nombre }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombre);
    await expect(page.getByText("Caliente").first()).toBeVisible();
    const porque = page.locator("section", { hasText: "Por qué tiene este puntaje" });
    await expect(porque.getByText("Terminó el tour 360°")).toBeVisible();
    await expect(porque.getByText("Pidió visita presencial")).toBeVisible();
    await expect(page.getByText(/Terminó el tour 360°/).first()).toBeVisible();
    await expect(page.getByText(/Recorrió /).first()).toBeVisible();

    // Limpieza
    await page.getByRole("button", { name: "Eliminar lead" }).click();
    await page.getByRole("dialog", { name: "¿Eliminar este lead?" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL(/\/admin\/leads$/);
  });

  test("link de pre-visita: se genera, el prospecto lo abre y se ve en su lead", async ({ page, browser }, info) => {
    test.setTimeout(180_000);
    const nombre = `E2E Link ${info.project.name} ${Date.now()}`;
    await entrarAlPanel(page);
    await page.goto("/admin/leads");
    await page.getByRole("button", { name: "Generar link de pre-visita" }).first().click();
    const hoja = page.getByRole("dialog", { name: "Link de pre-visita" });
    await hoja.getByLabel("Nombre del prospecto").fill(nombre);
    await hoja.getByRole("button", { name: "Generar link" }).click();
    const url = (await hoja.locator("p.font-mono").textContent())!.trim();
    expect(url).toMatch(/\/v\/[a-z0-9]{8}$/);
    const leadHref = await hoja.getByRole("link", { name: "Ver el lead" }).getAttribute("href");

    // Antes de abrirlo
    await page.goto(leadHref!);
    await expect(page.getByText("Todavía no lo abrió.")).toBeVisible();

    // El prospecto lo abre en su celular
    const prospecto = await visitanteNuevo(browser, info);
    await prospecto.goto(new URL(url).pathname);
    await expect(prospecto).toHaveURL(/\/propiedad\/[^/]+\?utm_source=link_previsita/);
    await expect(prospecto.getByRole("heading", { level: 1 })).toBeVisible();
    await prospecto.waitForTimeout(3000);
    await prospecto.context().close();

    await page.reload();
    await expect(page.getByText("Lo abrió.")).toBeVisible();
    await expect(page.getByText(/Vio la ficha/).first()).toBeVisible();

    await page.getByRole("button", { name: "Eliminar lead" }).click();
    await page.getByRole("dialog", { name: "¿Eliminar este lead?" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL(/\/admin\/leads$/);
  });
});
