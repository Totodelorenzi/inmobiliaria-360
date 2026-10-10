import { randomUUID } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// Variables de .env.local (credenciales del admin, URL de Supabase). No pisa las ya definidas.
try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: solo corren los tests @sin-datos
}

/** URL a probar: producción/preview con E2E_BASE_URL, o el build local en el puerto 3100. */
const remoto = Boolean(process.env.E2E_BASE_URL);
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const claveSecreta = process.env.SUPABASE_SECRET_KEY ?? "";

/**
 * Regla (ver CLAUDE.md): los tests que escriben lo hacen solo en una inmobiliaria de prueba propia de
 * la corrida (e2e-<corrida>, es_test), con una copia de la demo y un admin de prueba
 * (tests/e2e/global-setup.ts). Sin la clave secreta no se puede crear: corren solo los @sin-datos.
 */
process.env.E2E_CORRIDA ??= randomUUID().replace(/-/g, "").slice(0, 8);
const sitioDePrueba = `e2e-${process.env.E2E_CORRIDA}`;
const conDatos = supabaseUrl !== "" && !supabaseUrl.includes("PLACEHOLDER") && claveSecreta !== "" && !claveSecreta.includes("PLACEHOLDER");

/**
 * Multi-inmobiliaria. En local, el servidor corre con DOMINIO_BASE=prueba.localhost:3100: cada web en
 * <subdominio>.prueba.localhost:3100 (Chromium resuelve *.localhost solo) y el panel en app.…
 * Contra producción, E2E_DOMINIO_BASE habilita esos tests cuando haya un dominio real.
 */
process.env.E2E_DOMINIO_BASE ??= remoto ? "" : "prueba.localhost:3100";
/** En los hosts de prueba, la web que miran los tests se elige con esta cookie: la de la corrida. */
const estadoInicial = {
  cookies: [
    { name: "sitio_prueba", value: sitioDePrueba, domain: new URL(baseURL).hostname, path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const },
  ],
  origins: [],
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: remoto ? 1 : 0,
  workers: 2,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  // Sin la clave secreta (no hay inmobiliaria de prueba) solo corre lo que no necesita datos.
  grepInvert: !conDatos ? /@con-datos|@admin|@multi|@demo/ : undefined,
  use: {
    baseURL,
    storageState: estadoInicial,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: remoto
    ? undefined
    : {
        command: "npm run start -- -p 3100",
        url: `${baseURL}/robots.txt`,
        reuseExistingServer: true,
        timeout: 120_000,
        // Todas las variables (por si webServer.env reemplaza en vez de sumar) + el dominio de prueba.
        env: { ...(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>), DOMINIO_BASE: process.env.E2E_DOMINIO_BASE ?? "" },
      },
});
