# Decisiones técnicas

Una línea por decisión: fecha · qué · por qué.

- 2026-09-27 · Rama principal `main` (renombrada desde `master`) · Vercel se conecta a main (etapa 9) y todavía no había remoto.
- 2026-09-27 · Se ignoran los avisos "extraneous" de `npm ls` (@emnapi/*, @img/sharp-wasm32, @napi-rs/wasm-runtime, @tybys/wasm-util) · son el fallback wasm opcional de sharp, `npm prune` no los quita y no afectan tsc, lint ni build.
- 2026-09-27 · `.gitignore` mantiene `.env*` con la excepción `!.env.example` · versionar la plantilla sin exponer secretos.
- 2026-09-27 · Variables `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` · Supabase reemplazó anon/service_role por publishable/secret; supabase-js acepta los dos formatos, así que sirven las claves nuevas o las legacy.
- 2026-09-27 · El sitio público muestra la inmobiliaria indicada en `AGENCY_ID` (opcional: si falta y hay una sola en la base, usa esa) · el modelo no tiene dominio ni slug por agencia; replicar para otra inmobiliaria = otro deploy con otro `AGENCY_ID`.
- 2026-09-27 · `NEXT_PUBLIC_SITE_URL` es opcional en Vercel, con fallback a `VERCEL_PROJECT_PRODUCTION_URL` · las URL absolutas (OG, sitemap, emails) funcionan sin configurar nada extra.
- 2026-09-27 · Organización nueva de Supabase solo por orden, no por el límite · la doc de Supabase dice que el límite de 2 proyectos gratis es por usuario Owner/Admin sumando todas sus organizaciones (los pausados no cuentan); la spec asumía que era por organización. La guía lo advierte.
- 2026-09-27 · Registro público desactivado en Supabase Auth (SETUP-CUENTAS paso 5) · los agentes entran solo por invitación; evita cuentas basura aunque RLS ya las deja sin permisos.
