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
const conDatos = remoto || (supabaseUrl !== "" && !supabaseUrl.includes("PLACEHOLDER"));
const conAdmin = conDatos && Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

/**
 * Multi-inmobiliaria. En local, el servidor corre con DOMINIO_BASE=prueba.localhost:3100: cada web en
 * <subdominio>.prueba.localhost:3100 (Chromium resuelve *.localhost solo) y el panel en app.…
 * Contra producción, E2E_DOMINIO_BASE habilita esos tests cuando haya un dominio real.
 */
process.env.E2E_DOMINIO_BASE ??= remoto ? "" : "prueba.localhost:3100";
/** El resto de los tests mira la web de ejemplo: en los hosts de prueba se elige con esta cookie. */
const sitioDePrueba = {
  cookies: [
    { name: "sitio_prueba", value: "horizonte", domain: new URL(baseURL).hostname, path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const },
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
  // Sin base real solo corre lo que no necesita datos; sin credenciales, se saltea el panel.
  grepInvert: !conDatos ? /@con-datos|@admin/ : !conAdmin ? /@admin/ : undefined,
  use: {
    baseURL,
    storageState: sitioDePrueba,
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
