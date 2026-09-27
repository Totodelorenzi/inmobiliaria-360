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
    : { command: "npm run start -- -p 3100", url: `${baseURL}/robots.txt`, reuseExistingServer: true, timeout: 120_000 },
});
