# Progreso

Leyenda: [ ] pendiente · [~] en curso · [x] hecho

**Próximo paso:** Etapa 3 (Web pública completa): inicio, listados con filtros en la URL, ficha, SEO (sitemap, robots, JSON-LD, OG), 404.

**Cómo verificar:** `npm run typecheck`, `npm run lint`, `npm test` (unitarios + base con PGlite), `npm run build`.

## Arranque

- [x] 2A. Auditoría: el estado coincide con lo esperado; tsc, lint y build limpios; rama renombrada a `main`.
- [x] 2B. Documentación: CLAUDE.md, docs/, `.env.example`, `.env.local` con placeholders.
- [x] 2C. Guía de cuentas mostrada al usuario.

## Etapas

- [x] 1. Base: dependencias, carpetas, clientes Supabase, `env.ts`, `proxy.ts`, layout, sistema de diseño (tokens, fuentes, componentes en src/components/ui).
- [x] 2. Base de datos: migraciones (esquema, RLS, Storage) en supabase/migrations, 26 tests PGlite en tests/db, tipos a mano.
- [ ] 3. Web pública completa.
- [ ] 4. Visores: tour 360° y planos.
- [ ] 5. Panel /admin completo.
- [ ] 6. Seed, create-admin y "Borrar datos de ejemplo".
- [ ] 7. Calidad local: tsc, eslint, build, Playwright, RLS.
  - [ ] BLOQUEO A: Supabase configurado (SETUP-CUENTAS pasos 1 y 2).
- [ ] 8. Supabase real: link, db push, Storage, seed, admin, tipos generados, tests.
  - [ ] BLOQUEO B: repo en GitHub y Vercel logueado (SETUP-CUENTAS pasos 3 y 4).
- [ ] 9. Deploy en Vercel (y SETUP-CUENTAS paso 5).
- [ ] 10. Calidad en producción: Playwright, Lighthouse ≥90, RLS real, secretos.
- [ ] 11. Entrega: README y resumen final.

## Pendientes del usuario

- Decidir qué hacer con 2 cambios sueltos en `C:\Users\Mi PC\obraiq-temp` que probablemente dejó la sesión anterior: `.claude/settings.local.json` (modificado) y `supabase/.temp/` (sin versionar). No se tocaron.
- SETUP-CUENTAS pasos 1 a 4 (en paralelo).
