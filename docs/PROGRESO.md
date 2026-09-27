# Progreso

Leyenda: [ ] pendiente · [~] en curso · [x] hecho

**Próximo paso:** Etapa 5, seguir con el editor de propiedades en 5 pasos (/admin/propiedades/[id]), después consultas, configuración, usuarios y ayuda.

**Cómo verificar:** `npm run typecheck`, `npm run lint`, `npm test` (unitarios + base con PGlite), `npm run build`.

## Arranque

- [x] 2A. Auditoría: el estado coincide con lo esperado; tsc, lint y build limpios; rama renombrada a `main`.
- [x] 2B. Documentación: CLAUDE.md, docs/, `.env.example`, `.env.local` con placeholders.
- [x] 2C. Guía de cuentas mostrada al usuario.

## Etapas

- [x] 1. Base: dependencias, carpetas, clientes Supabase, `env.ts`, `proxy.ts`, layout, sistema de diseño (tokens, fuentes, componentes en src/components/ui).
- [x] 2. Base de datos: migraciones (esquema, RLS, Storage) en supabase/migrations, 26 tests PGlite en tests/db, tipos a mano.
- [x] 3. Web pública: inicio, listados con filtros en la URL, ficha, consulta, WhatsApp, OG, sitemap, robots, 404. Probado sin datos; falta probar con datos reales (etapa 8).
- [x] 4. Visores: tour 360° (Pannellum) y planos con zoom/paneo táctil. Falta probarlos con datos reales (etapa 8).
- [~] 5. Panel /admin. Hecho: acceso (login, recuperar, nueva contraseña, links de mail), dashboard, listado con acciones, Server Actions de todo, procesamiento y subida de imágenes. Falta: editor en 5 pasos, consultas, configuración, usuarios, ayuda.
- [ ] 6. Seed, create-admin y "Borrar datos de ejemplo".
- [ ] 7. Calidad local: tsc, eslint, build, Playwright, RLS.
  - [ ] BLOQUEO A: Supabase configurado (SETUP-CUENTAS pasos 1 y 2).
- [ ] 8. Supabase real: link, db push, Storage, seed, admin, tipos generados, tests.
  - [ ] BLOQUEO B: repo en GitHub y Vercel logueado (SETUP-CUENTAS pasos 3 y 4).
- [ ] 9. Deploy en Vercel (y SETUP-CUENTAS paso 5).
- [ ] 10. Calidad en producción: Playwright, Lighthouse ≥90, RLS real, secretos.
- [ ] 11. Entrega: README y resumen final.

## Pendientes técnicos

- Probar con datos reales apenas haya Supabase: inicio, filtros, ficha, mapa, consulta, OG, tour (hotspots, giroscopio en iPhone) y planos (pellizco).
- Límite de consultas por IP en /api/whatsapp y el formulario (hoy: trampa anti-bots + validación).

## Pendientes del usuario

- Decidir qué hacer con 2 cambios sueltos en `C:\Users\Mi PC\obraiq-temp` que probablemente dejó la sesión anterior: `.claude/settings.local.json` (modificado) y `supabase/.temp/` (sin versionar). No se tocaron.
- SETUP-CUENTAS pasos 1 a 4 (en paralelo).
