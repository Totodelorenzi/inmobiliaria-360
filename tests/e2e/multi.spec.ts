import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { borrarAgenciaDePrueba, borrarUsuarioDePrueba, crearAgenciaDePrueba, exigirAgenciaDePrueba } from "./proteccion";
import { corrida, expect, test } from "./utiles";

/**
 * Varias inmobiliarias en hosts reales: <subdominio>.<E2E_DOMINIO_BASE> y el panel en app.…
 * Crea dos inmobiliarias de prueba (es_test) con una propiedad del mismo slug y dos usuarios de prueba;
 * al final las borra a través de la protección (proteccion.ts).
 */
const base = process.env.E2E_DOMINIO_BASE ?? "";
const protocolo = /localhost/.test(base) ? "http" : "https";
const web = (sub: string) => `${protocolo}://${sub}.${base}`;
const panel = `${protocolo}://app.${base}`;
const SLUG = "depto-e2e-mismo-slug";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const claveSecreta = process.env.SUPABASE_SECRET_KEY ?? "";
const admin = () => createClient<Database>(supabaseUrl, claveSecreta, { auth: { persistSession: false } });

const sufijo = corrida();
const agencia = (letra: string) => ({ sub: `e2e-${letra}-${sufijo}`, nombre: `E2E ${letra.toUpperCase()} ${sufijo}`, titulo: `Depto de ${letra.toUpperCase()} ${sufijo}`, id: "", propiedad: "" });
const A = agencia("a");
const B = agencia("b");
const usuario = (nombre: string) => ({ email: `e2e-${nombre}-${sufijo}@example.com`, clave: `Prueba${sufijo}2024`, id: "" });
const enAmbas = usuario("ambas");
const soloA = usuario("solo-a");

async function entrar(page: Page, u: { email: string; clave: string }) {
  await page.goto(`${panel}/admin/login`);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Contraseña").fill(u.clave);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(`${panel}/admin`);
}

test.describe("varias inmobiliarias", { tag: "@multi" }, () => {
  test.skip(!base || !claveSecreta, "Hace falta E2E_DOMINIO_BASE y la clave secreta de Supabase");
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium resuelve *.localhost sin configurar nada");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const db = admin();
    for (const ag of [A, B]) {
      ag.id = await crearAgenciaDePrueba(db, ag.sub, ag.nombre);
      await exigirAgenciaDePrueba(db, ag.id);
      const { data: p, error: e2 } = await db
        .from("properties")
        .insert({ agency_id: ag.id, titulo: ag.titulo, slug: SLUG, operacion: "venta", tipo: "departamento", publicada: true, precio: 100000, moneda: "USD", barrio: "Palermo" })
        .select("id")
        .single();
      if (e2) throw e2;
      ag.propiedad = p.id;
    }
    for (const u of [enAmbas, soloA]) {
      const { data, error } = await db.auth.admin.createUser({ email: u.email, password: u.clave, email_confirm: true });
      if (error) throw error;
      u.id = data.user.id;
    }
    const { error } = await db.from("agency_members").insert([
      { user_id: enAmbas.id, agency_id: A.id, rol: "admin" },
      { user_id: enAmbas.id, agency_id: B.id, rol: "admin" },
      { user_id: soloA.id, agency_id: A.id, rol: "admin" },
    ]);
    if (error) throw error;
  });

  test.afterAll(async () => {
    const db = admin();
    for (const ag of [A, B]) if (ag.id) await borrarAgenciaDePrueba(db, ag.id);
    for (const u of [enAmbas, soloA]) if (u.id) await borrarUsuarioDePrueba(db, u.id);
  });

  test("cada host muestra solo su web, aunque las propiedades tengan el mismo slug", async ({ page }) => {
    await page.goto(`${web(A.sub)}/propiedad/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(A.titulo);
    await page.goto(`${web(B.sub)}/propiedad/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(B.titulo);
    // Ya en caché: sigue sin mezclarse.
    await page.goto(`${web(A.sub)}/propiedad/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(A.titulo);
    await page.goto(web(A.sub));
    await expect(page.getByText(A.titulo).first()).toBeVisible();
    await expect(page.getByText(B.titulo)).toHaveCount(0);
    // Las rutas internas no se alcanzan desde afuera.
    expect((await page.request.get(`${web(A.sub)}/s/${B.sub}/propiedad/${SLUG}`, { maxRedirects: 0 })).status()).toBe(404);
  });

  test("/admin desde la web de una inmobiliaria lleva al panel central", async ({ page }) => {
    await page.goto(`${web(A.sub)}/admin/propiedades`);
    await expect(page).toHaveURL(new RegExp(`^${panel}/admin/login`));
  });

  test("con dos inmobiliarias se elige la activa y se ven sus datos", async ({ page }) => {
    await entrar(page, enAmbas);
    const selector = page.getByRole("combobox", { name: "Inmobiliaria" });
    await expect(selector).toHaveValue(A.id);
    await selector.selectOption(B.id);
    await expect(selector).toHaveValue(B.id);
    await page.goto(`${panel}/admin/propiedades`);
    await expect(page.getByText(B.titulo)).toBeVisible();
    await expect(page.getByText(A.titulo)).toHaveCount(0);
    // "Ver el sitio" lleva al dominio de la activa.
    await expect(page.getByRole("link", { name: "Ver el sitio" })).toHaveAttribute("href", new RegExp(`^${web(B.sub)}`));
  });

  test("un usuario de A no opera sobre B aunque manipule la cookie o la API", async ({ page, context }) => {
    await entrar(page, soloA);
    // Cookie de inmobiliaria activa apuntando a B: se ignora (no es miembro).
    await context.addCookies([{ name: "agencia_activa", value: B.id, domain: new URL(panel).hostname, path: "/admin" }]);
    await page.goto(`${panel}/admin/propiedades`);
    await expect(page.getByText(A.titulo)).toBeVisible();
    await expect(page.getByText(B.titulo)).toHaveCount(0);
    // El panel transmite "cargando" con 200 antes de resolver: se mira el contenido final, no el código.
    await page.goto(`${panel}/admin/propiedades/${B.propiedad}`);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(page.getByText(B.titulo)).toHaveCount(0);

    // Directo contra la API con su sesión: la base no le deja tocar nada de B.
    const supa = createClient<Database>(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false } });
    const { error: errorLogin } = await supa.auth.signInWithPassword({ email: soloA.email, password: soloA.clave });
    expect(errorLogin).toBeNull();
    const { data: editadas } = await supa.from("properties").update({ titulo: "hackeado" }).eq("id", B.propiedad).select("id");
    expect(editadas ?? []).toHaveLength(0);
    const { data: borradas } = await supa.from("properties").delete().eq("id", B.propiedad).select("id");
    expect(borradas ?? []).toHaveLength(0);
    const { error: errorMiembro } = await supa.from("agency_members").insert({ user_id: soloA.id, agency_id: B.id, rol: "admin" });
    expect(errorMiembro).not.toBeNull();
    const { error: errorDominio } = await supa.from("agencies").update({ subdominio: "robado" }).eq("id", A.id);
    expect(errorDominio).not.toBeNull();
    const { data: intacta } = await admin().from("properties").select("titulo").eq("id", B.propiedad).single();
    expect(intacta?.titulo).toBe(B.titulo);
  });
});
