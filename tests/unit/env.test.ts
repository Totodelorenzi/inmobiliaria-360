import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EnvError,
  getPublicEnv,
  getServerEnv,
  getSiteUrl,
  isSupabaseConfigured,
} from "../../src/lib/env.ts";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
];

function withEnv(vars: Record<string, string>, fn: () => void) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, vars);
  try {
    fn();
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.firma`;
const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
};

test("sin variables: error claro que nombra cada una y apunta a la guía", () => {
  withEnv({}, () => {
    assert.equal(isSupabaseConfigured(), false);
    assert.throws(getPublicEnv, (error: unknown) => {
      assert.ok(error instanceof EnvError);
      assert.match(error.message, /Falta NEXT_PUBLIC_SUPABASE_URL/);
      assert.match(error.message, /Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
      assert.match(error.message, /SETUP-CUENTAS/);
      return true;
    });
  });
});

test("valores PLACEHOLDER cuentan como no configurado", () => {
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://PLACEHOLDER.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "PLACEHOLDER" }, () => {
    assert.equal(isSupabaseConfigured(), false);
    assert.throws(getPublicEnv, /todavía tiene el valor PLACEHOLDER/);
  });
});

test("rechaza la clave secreta en la variable pública (nueva y legacy)", () => {
  for (const key of ["sb_secret_abc", jwt("service_role")]) {
    withEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, () => {
      assert.throws(getPublicEnv, /clave SECRETA/);
    });
  }
});

test("rechaza una URL con ruta o mal escrita", () => {
  for (const url of ["https://abc.supabase.co/rest/v1", "abc.supabase.co"]) {
    withEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: url }, () => {
      assert.throws(getPublicEnv, /NEXT_PUBLIC_SUPABASE_URL no es válida/);
    });
  }
});

test("valores válidos: devuelve la URL sin barra final", () => {
  withEnv({ ...VALID, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt("anon") }, () => {
    assert.equal(isSupabaseConfigured(), true);
    assert.equal(getPublicEnv().supabaseUrl, "https://abcdefghijklmnop.supabase.co");
  });
});

test("secret key: rechaza la pública y acepta la secreta", () => {
  for (const key of ["sb_publishable_abc", jwt("anon")]) {
    withEnv({ SUPABASE_SECRET_KEY: key }, () => {
      assert.throws(getServerEnv, /tiene la clave pública/);
    });
  }
  withEnv({ SUPABASE_SECRET_KEY: "sb_secret_abc" }, () => {
    assert.equal(getServerEnv().supabaseSecretKey, "sb_secret_abc");
  });
});

test("URL del sitio: explícita, de Vercel o localhost", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: "https://mi-inmobiliaria.com.ar/" }, () => {
    assert.equal(getSiteUrl(), "https://mi-inmobiliaria.com.ar");
  });
  withEnv({ VERCEL_PROJECT_PRODUCTION_URL: "inmobiliaria-360.vercel.app" }, () => {
    assert.equal(getSiteUrl(), "https://inmobiliaria-360.vercel.app");
  });
  withEnv({}, () => assert.equal(getSiteUrl(), "http://localhost:3000"));
});
