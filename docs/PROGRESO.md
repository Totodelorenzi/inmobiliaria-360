# Progreso

Leyenda: [ ] pendiente · [~] en curso · [x] hecho

**Próximo paso:** BLOQUEO A: que el usuario complete SETUP-CUENTAS pasos 1 y 2 (verificar con `npx supabase projects list`). Después, etapa 9 (Supabase real) y correr los E2E @con-datos y @admin.

**Cómo verificar:** `npm run typecheck`, `npm run lint`, `npm test` (unitarios + base con PGlite), `npm run build`, `npm run test:e2e` (Playwright; con el build hecho).

> 2026-10-06: cambio de alcance a "pre-visita digital" (ver docs/SPEC.md). Se agregó la etapa 6 y se renumeraron las siguientes: el seed pasó de 6 a 7, calidad local de 7 a 8, y así hasta la entrega (12).

## Arranque

- [x] 2A. Auditoría: el estado coincide con lo esperado; tsc, lint y build limpios; rama renombrada a `main`.
- [x] 2B. Documentación: CLAUDE.md, docs/, `.env.example`, `.env.local` con placeholders.
- [x] 2C. Guía de cuentas mostrada al usuario.

## Etapas

- [x] 1. Base: dependencias, carpetas, clientes Supabase, `env.ts`, `proxy.ts`, layout, sistema de diseño (tokens, fuentes, componentes en src/components/ui).
- [x] 2. Base de datos: 6 migraciones (esquema, RLS, Storage, búsqueda, pre-visita y sus restricciones), 32 tests PGlite en tests/db, tipos a mano.
  - [x] Modelo de pre-visita: visitors, visitor_events, visit_requests, tracked_links, columnas nuevas de leads, función estadisticas_propiedades, RLS (el público no lee ni escribe) y tests.
- [x] 3. Web pública: inicio, listados con filtros en la URL, ficha, consulta, WhatsApp, OG, sitemap, robots, 404. Falta probar con datos reales (etapa 9).
- [x] 4. Visores: tour 360° (Pannellum) y planos con zoom/paneo táctil. Falta probarlos con datos reales (etapa 9).
- [x] 5. Panel /admin: acceso, dashboard, propiedades (listado + editor en 5 pasos con autoguardado), fotos, tour con editor de hotspots, planos con puntos, consultas + CSV, configuración con vista previa, usuarios, ayuda. Falta probarlo con Supabase real (etapa 9).
- [x] 6. Pre-visita y calificación:
  - [x] Tracking propio (`src/lib/tracking/`): lotes con sendBeacon, tiempo visible por escena y plano, sesiones, tour completo configurable.
  - [x] Route handlers `/api/eventos` y `/v/[codigo]` con validación y límite de tasa; unión del historial con el lead; código de referencia en WhatsApp.
  - [x] Pedido de visita presencial (CTA principal en ficha y al completar el tour).
  - [x] Puntaje (`src/lib/scoring.ts`) con desglose y tests.
  - [x] Panel: leads por puntaje con nivel, estado y notas; detalle con línea de tiempo; estadísticas por propiedad; leads calientes en el dashboard; generar link de pre-visita; CSV y borrado demo ampliados.
  - [x] Privacidad: /privacidad (Ley 25.326), aviso de primera visita, casilla de consentimiento, borrar el propio historial.
- [x] 7. Seed (`npm run seed`), `npm run crear-admin` y botón "Borrar datos de ejemplo": propiedades, fotos, tours y planos + 3 semanas de actividad (60 visitantes, ~330 eventos, 15 leads frío/tibio/caliente, 5 pedidos de visita, 2 links). Probado con `--solo-imagenes` y con PGlite; la carga real va en la etapa 9.
- [x] 8. Calidad local: typecheck, lint y build sin warnings; 44 unitarios + 33 de base (RLS, integridad, seed) + 44 E2E por dispositivo (iPhone y escritorio): 14 corren sin base; los de web pública, pre-visita (tour completo, pedido de visita, lead con puntaje e historial, link personalizado) y panel se activan solos con Supabase y credenciales.
  - [ ] BLOQUEO A: Supabase configurado (SETUP-CUENTAS pasos 1 y 2).
- [ ] 9. Supabase real: link, db push, Storage, seed, admin, tipos generados, tests.
  - [ ] BLOQUEO B: repo en GitHub y Vercel logueado (SETUP-CUENTAS pasos 3 y 4).
- [ ] 10. Deploy en Vercel (y SETUP-CUENTAS paso 5).
- [ ] 11. Calidad en producción: Playwright, Lighthouse ≥90, RLS real, secretos.
- [ ] 12. Entrega: README y resumen final.

## Pendientes técnicos

- Probar con datos reales apenas haya Supabase: panel completo (login, subida de fotos/360°/PDF, hotspots, invitaciones), inicio, filtros, ficha, mapa, consulta, OG, tour (hotspots, giroscopio en iPhone), planos (pellizco) y todo el circuito de pre-visita.

## Pendientes del usuario

- Decidir qué hacer con 2 cambios sueltos en `C:\Users\Mi PC\obraiq-temp` que probablemente dejó la sesión anterior: `.claude/settings.local.json` (modificado) y `supabase/.temp/` (sin versionar). No se tocaron.
- SETUP-CUENTAS pasos 1 a 4 (en paralelo).
