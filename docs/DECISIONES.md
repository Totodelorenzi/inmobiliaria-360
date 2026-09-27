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
- 2026-09-27 · `proxy.ts` solo corre en `/admin/:path*` · la web pública no usa sesión: sin proxy queda estática/cacheable (Lighthouse). Libres dentro de /admin: `/admin/login`, `/admin/recuperar`, `/admin/auth/*`.
- 2026-09-27 · Cuarto cliente `createPublicClient()` (anónimo, sin cookies) además de navegador, servidor y admin · leer cookies vuelve dinámica la ruta; las lecturas públicas no lo necesitan (RLS aplica igual).
- 2026-09-27 · Sesión validada con `auth.getClaims()` · recomendado por @supabase/ssr 0.12: valida el JWT; `getSession()` no es confiable en el servidor.
- 2026-09-27 · Sin paquete `server-only` instalado · Next 16 lo resuelve internamente (doc "Server and Client Components").
- 2026-09-27 · Tipografías Bricolage Grotesque (títulos) + Inter (texto) con next/font · identidad propia, autoalojadas, sin impacto en CLS.
- 2026-09-27 · Solo tema claro (se quitó el modo oscuro del template) · las fotos y el color de cada inmobiliaria se ven consistentes y el contraste se controla en un solo tema.
- 2026-09-27 · `brandStyle()` calcula texto blanco/oscuro, oscurece tonos medios y genera `--brand-ink` · cualquier color que elija la inmobiliaria cumple contraste AA.
- 2026-09-27 · Verde de WhatsApp `#0e7a40` en lugar del oficial · el oficial con texto blanco no llega a 4.5:1.
- 2026-09-27 · Íconos con lucide-react · mantenido y tree-shakeable; solo viaja lo que se usa.
- 2026-09-27 · `cn()` propio sin clsx ni tailwind-merge · 3 líneas; los componentes evitan clases en conflicto.
- 2026-09-27 · Tests unitarios con `node --test` (tests/unit) y `allowImportingTsExtensions` · Node 24 ejecuta TypeScript nativo: cero dependencias.
- 2026-09-27 · @supabase/ssr y @supabase/supabase-js fijadas a versión exacta · son las verificadas; se actualizan a propósito, no por accidente.
