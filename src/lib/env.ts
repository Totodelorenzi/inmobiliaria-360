/**
 * Variables de entorno validadas, con mensajes claros cuando faltan o están mal.
 *
 * Las NEXT_PUBLIC_* se leen como `process.env.NOMBRE` literal para que Next las
 * incruste en el bundle del navegador. Las demás solo existen en el servidor.
 */

const HELP =
  "Revisá .env.local (plantilla en .env.example, guía en docs/SETUP-CUENTAS.md). En Vercel: Settings → Environment Variables.";

export class EnvError extends Error {
  constructor(problems: string[]) {
    super(`Configuración incompleta:\n- ${problems.join("\n- ")}\n${HELP}`);
    this.name = "EnvError";
  }
}

const isBlank = (value: string | undefined): value is undefined => !value || value.trim() === "";
const isPlaceholder = (value: string) => value.includes("PLACEHOLDER");

/** Rol de una clave legacy (JWT) de Supabase: "anon" o "service_role". */
function jwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!key.startsWith("eyJ") || !payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

function checkPresent(name: string, value: string | undefined, problems: string[]): value is string {
  if (isBlank(value)) {
    problems.push(`Falta ${name}.`);
    return false;
  }
  if (isPlaceholder(value)) {
    problems.push(`${name} todavía tiene el valor PLACEHOLDER.`);
    return false;
  }
  return true;
}

/** true si la URL y la clave pública de Supabase están cargadas (no vacías ni PLACEHOLDER). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return !isBlank(url) && !isPlaceholder(url) && !isBlank(key) && !isPlaceholder(key);
}

/** URL pública del sitio, sin barra final. Nunca falla: en local cae a http://localhost:3000. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = !isBlank(explicit) ? explicit : vercel ? `https://${vercel}` : "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

type PublicEnv = { supabaseUrl: string; supabasePublishableKey: string };

/** Variables públicas (servidor y navegador). Lanza EnvError si faltan o son inválidas. */
export function getPublicEnv(): PublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const problems: string[] = [];

  if (checkPresent("NEXT_PUBLIC_SUPABASE_URL", url, problems)) {
    let valid = false;
    try {
      const { protocol, pathname } = new URL(url);
      valid = (protocol === "https:" || protocol === "http:") && (pathname === "/" || pathname === "");
    } catch {}
    if (!valid) {
      problems.push(
        "NEXT_PUBLIC_SUPABASE_URL no es válida: tiene que ser https://<project-ref>.supabase.co, sin nada después.",
      );
    }
  }
  if (checkPresent("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key, problems)) {
    if (key.startsWith("sb_secret_") || jwtRole(key) === "service_role") {
      problems.push(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene la clave SECRETA: eso la expone en el navegador. Poné la publishable (sb_publishable_…) o la anon.",
      );
    }
  }
  if (problems.length > 0) throw new EnvError(problems);

  return { supabaseUrl: url!.replace(/\/+$/, ""), supabasePublishableKey: key! };
}

type ServerEnv = { supabaseSecretKey: string };

/** Variables secretas. Solo servidor: lanza si se llama desde el navegador. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() solo se puede usar en el servidor.");
  }
  const secret = process.env.SUPABASE_SECRET_KEY;
  const problems: string[] = [];

  if (checkPresent("SUPABASE_SECRET_KEY", secret, problems)) {
    if (secret.startsWith("sb_publishable_") || jwtRole(secret) === "anon") {
      problems.push(
        "SUPABASE_SECRET_KEY tiene la clave pública: poné la secret (sb_secret_…) o la service_role.",
      );
    }
  }
  if (problems.length > 0) throw new EnvError(problems);

  return { supabaseSecretKey: secret! };
}

/** ID de la inmobiliaria que muestra este sitio; null si no se fijó (se usa la única que haya). */
export function getAgencyId(): string | null {
  const id = process.env.AGENCY_ID;
  return isBlank(id) || isPlaceholder(id) ? null : id.trim();
}
