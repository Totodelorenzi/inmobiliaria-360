import type { Page } from "@playwright/test";
import { expect, test, tituloDePrueba } from "./utiles";

const FOTO = "tests/e2e/fixtures/foto.jpg";

async function entrar(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("panel de administración", { tag: "@admin" }, () => {
  test.describe.configure({ mode: "serial" });

  test("contraseña incorrecta: mensaje claro", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL!);
    await page.getByLabel("Contraseña").fill("no-es-la-clave-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    // Filtrado: Next también tiene un role="alert" (el anunciador de rutas, vacío).
    await expect(page.getByRole("alert").filter({ hasText: "Email o contraseña incorrectos" })).toBeVisible();
  });

  test("alta completa de una propiedad y verla publicada", async ({ page }, info) => {
    test.setTimeout(180_000);
    const titulo = tituloDePrueba(info.project.name);
    await entrar(page);

    // Paso 1: datos (autoguardado)
    await page.getByRole("button", { name: "Cargar propiedad" }).first().click();
    await expect(page).toHaveURL(/\/admin\/propiedades\/[0-9a-f-]{36}$/);
    await page.getByText("Alquiler", { exact: true }).click();
    await page.getByLabel(/Título del aviso/).fill(titulo);
    await page.getByLabel("Precio", { exact: true }).fill("650.000");
    // exact: la ayuda de "Mostrar la dirección exacta" también menciona el barrio.
    await page.getByLabel("Barrio", { exact: true }).fill("Palermo");
    await page.getByLabel("Ciudad", { exact: true }).fill("CABA");
    await page.getByLabel("Ambientes", { exact: true }).fill("2");
    await page.getByLabel("Ciudad", { exact: true }).blur();
    await expect(page.getByText("Cambios guardados")).toBeVisible();

    // Paso 2: fotos
    await page.getByRole("link", { name: /Fotos/ }).first().click();
    await page.locator('input[type="file"][multiple]').setInputFiles(FOTO);
    await expect(page.getByRole("heading", { name: "Fotos cargadas (1)" })).toBeVisible({ timeout: 60_000 });

    // Paso 5: publicar
    await page.getByRole("link", { name: /Publicar/ }).first().click();
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("¡Publicada! Ya se ve en la web.")).toBeVisible();
    const enlace = await page.getByRole("link", { name: "Ver en la web", exact: true }).getAttribute("href");

    // Se ve en la web pública
    await page.goto(new URL(enlace!).pathname);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
    await expect(page.getByText("$ 650.000/mes").first()).toBeVisible();

    // Limpieza: eliminar la propiedad de prueba
    await page.goto(`/admin/propiedades?q=${encodeURIComponent(titulo)}`);
    await page.getByRole("button", { name: `Más acciones para ${titulo}` }).click();
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("dialog", { name: "¿Eliminar esta propiedad?" }).getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Propiedad eliminada.")).toBeVisible();
  });
});
