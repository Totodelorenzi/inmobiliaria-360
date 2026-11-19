# Progreso

Leyenda: [ ] pendiente · [~] en curso · [x] hecho

**Próximo paso:** el usuario revisa en el preview las imágenes reales de la tipología 1 y los polígonos propuestos; cuando deje las de t2 y t3 en `demo-mirador/`, correr `npm run imagenes:mirador`, después los E2E y recién con su OK unir `udevelop-demo` a `main`.

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
  - [x] BLOQUEO A: Supabase configurado (proyecto `inmobiliaria-360`, ref uwoepqxslqdffuaczzbk, São Paulo; CLI logueada).
- [x] 9. Supabase real:
  - [x] Link, db push (8 migraciones: se sumaron 0007 permisos por defecto y 0008 ajustes del asesor), Storage verificado.
  - [x] Seguridad verificada contra la base real (RLS, grants, API con publishable key, asesor sin problemas).
  - [x] Seed cargado (Horizonte Propiedades, 9 propiedades, 60 visitantes, 15 leads) y tipos generados desde la base.
  - [x] Tests: 44 unitarios + 34 de base + 34 E2E con datos reales (iPhone y escritorio). Los E2E limpian lo que crean.
  - [x] Admin creado (`npm run crear-admin`; contraseña solo en .env.local) y E2E @admin pasando.
  - [x] BLOQUEO B: repo en GitHub (privado, `main` subido) y Vercel logueado (totodelorenzi).
- [x] 10. Deploy en Vercel (producción: https://inmobiliaria-360-kohl.vercel.app):
  - [x] Proyecto nuevo `inmobiliaria-360` creado y vinculado (prj_1fGFLUcUCKpfpcBjf9DGSZrpC4dy); variables de Supabase en Production y Preview.
  - [x] Repo de GitHub conectado (deploy automático en cada push a main); web verificada: todas las páginas responden.
  - [x] Supabase Auth por código (`supabase config push`): Site URL, redirects, registro cerrado, contraseñas. Plantillas en español pendientes de SMTP propio (opcional).
- [~] 11. Calidad en producción:
  - [x] Playwright contra producción: 42/42 (iPhone y escritorio, sin reintentos), sin restos en la base.
  - [x] RLS real verificada (anónimo no lee ni escribe datos privados; asesor de Supabase sin problemas). Secretos: historial limpio.
  - [~] Lighthouse mobile (2026-10-11, demo en producción, Lighthouse 12 en esta PC con CPU 2× calibrada; la API de PageSpeed sin clave no tiene cupo):
    | Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP real observado | CLS |
    |---|---|---|---|---|---|---|
    | Inicio | 72–86 | 100 | 100 | 100 | 1,2–2,0 s | 0 |
    | Ficha | 73–83 | 100 | 100 | 100 | 1,0–1,3 s | 0 (antes 0,24 en la primera carga) |
    | Tour | 74–80 (antes 50–80) | 100 | 100 | 100 | 1,4–1,8 s | 0,002 |
    | Privacidad (referencia, mismo esqueleto) | 97 | 100 | 100 | 100 | 0,9 s | 0 |
    Corregido: salto del pie en la ficha, aviso de privacidad pintado tarde en el tour, foto principal precargada (Load Delay 1,7 s → 0,25 s). Pendiente para llegar a 90 en inicio/ficha/tour: miniaturas de 400 px en WebP para las tarjetas y panorámica liviana (4096 px) para celular (requiere regenerar imágenes). Medición oficial: pagespeed.web.dev desde el navegador o API de PageSpeed con clave.
- [x] 11b. Plataforma multi-inmobiliaria (2026-10-09):
  - [x] Migración 0009: subdominio y dominio propio, slug único por inmobiliaria, platform_admins, el admin no cambia sus dominios. Aplicada en la base real (la demo es `horizonte`).
  - [x] Proxy por host → `/s/[sitio]/...` (caché separada por inmobiliaria), panel central, hosts de prueba con `?agencia=`, `/s/*` bloqueado.
  - [x] Panel: inmobiliaria activa validada, selector, links con el dominio real, sección Plataforma (alta de inmobiliarias + dominio propio + API de Vercel opcional).
  - [x] Auth: mails siempre al panel central.
  - [x] Tests: 47 unitarios, 38 de base, E2E completos en local (incluidos 4 de multi-inmobiliaria con dos inmobiliarias y el mismo slug).
  - [x] Deploy y E2E contra producción: 42/42 (los 8 de multi-inmobiliaria se activan con dominio real). Admin inicial marcado como superadmin.
- [x] 11c. Seguridad de los tests en producción (2026-10-09): inmobiliaria de prueba por corrida (es_test), protección en la limpieza con test, ids únicos, test de solo lectura sobre la demo, regla en CLAUDE.md. Verificado: la demo no cambia con una corrida completa.
- [x] 11d. Imagen para compartir en JPG 1200×630 (~65 KB), verificada como la pide WhatsApp.
- [x] 12. Entrega: README en español y resumen final (2026-10-11). E2E: 48/48 local, 44/44 producción.
- [x] 13. Usuario de demo para presentaciones (2026-10-19): `demo@inmobiliaria360.example` (agente de la demo, contraseña en .env.local) creado y probado en el panel publicado; actividad de ejemplo corrida al presente (4 leads calientes y 10 nuevos en la semana). Supabase se había pausado por inactividad: el usuario lo reactivó.
- [x] 14. Skill `web-inmobiliaria-cliente` instalada en `.claude/skills/` (2026-10-20), sección "Webs de clientes" en CLAUDE.md y `docs/clientes/registro-diseno.md`. Relevamiento hecho: los choques entre la skill y la app (estado comercial, asesor por propiedad, rótulo por ambiente en fotos, tema por cliente, switch del 360, crédito de la plataforma) esperan decisión del usuario antes de tocar código o esquema.

- [x] 15. Webs de clientes con la skill (2026-11-09, rama `webs-de-clientes`):
  - [x] Migración 0011 (aditiva): estado comercial, asesores y asesor por propiedad, ambiente de cada foto, switch del 360, matrícula, horarios y tema por inmobiliaria. 5 tests nuevos en PGlite (44 en total).
  - [x] Web: tema y tipografías por cliente, crédito "Hecho con udevelop", ficha con pestañas y portada del recorrido, CTA según el avance del recorrido, asesor en la ficha y en el WhatsApp, estados reservada/vendida/alquilada, fotos por ambiente, switch del 360 en toda la web.
  - [x] Panel: sección Asesores, estado y asesor en cada propiedad, ambiente en cada foto, switch del 360, matrícula y horarios, "No contar mis visitas", resumen del lead para el asesor.
  - [x] `npm run tema -- <subdominio>` y seed con asesores. Typecheck, lint, build y 58 unitarios OK.
  - [x] Migración aplicada en la base real (2026-11-10), demo recargada con asesores y fotos rotuladas, E2E 48/48 en local (6 de varios dominios se saltean) y merge a `main`.

- [~] 16. uDevelop: módulo desarrolladora (rama `udevelop-demo`, 2026-11-16). Reglas del usuario: una sola base (no hay clientes reales), migraciones solo aditivas, sin tests nuevos salvo permisos, no tocar "Emprendimientos", no renombrar nada.
  - [x] Bloque 1 – Datos: migración 0012 (módulos por inmobiliaria, proyectos, pisos, tipologías, ambientes, unidades, polígonos en porcentajes, columnas de seguimiento y `leads.unit_id`) aplicada en la base real; 5 tests de permisos en PGlite; tipos regenerados; menú del panel según módulo; `npm run seed:desarrolladora` (tenant `desarrollos-demo`, Edificio Mirador, 23 unidades).
  - [x] Bloque 2 – Web del comprador: grupo de rutas `(edificio)` con `/proyecto/[slug]` (fachada con pisos tocables: hover en compu, doble toque en celular), `/piso/[n]` (planta coloreada por estado), `/unidad/[codigo]` (maqueta, ficha, "Ver ambientes" solo si hay renders, "Pedir información") y `/ambientes` (pantalla completa con fundido, deslizar o botones). Espejado con CSS. Sin Pannellum; imagen principal precargada. Inicio de un tenant sin módulo inmobiliaria → su proyecto.
  - [x] Bloque 3 – Leads: `pedirInformacion` usa el lead por visitante, guarda `unit_id` (la última) y registra `form_submit` con la unidad; `/api/eventos` valida `floor_view`, `unit_view`, `rooms_open`, `room_view` contra proyectos publicados; puntaje con pesos nuevos sin tocar los existentes; el detalle del lead muestra "Unidades que miró".
  - [x] Bloque 4 – Panel mínimo: `/admin/proyectos/[id]` con Unidades (estado en un toque), Imágenes (reemplazo, comprimidas a 1600 px) y Zonas (marcador de vértices sobre la fachada o la planta). Probado en celular simulado con el usuario de demo.
  - [x] Ajuste al edificio real (2026-11-17): planta baja (PB A, B, D, E; la C es el hall) y pisos 1 a 4 con A–E sobre la misma planta tipo; tipologías 1, 2 y 3 dormitorios (B y D espejadas), precios en USD, estados mezclados. 10 leads de muestra con historial (3 calientes, 3 tibios, 4 fríos) y 30 visitantes anónimos, regenerados por `npm run seed:desarrolladora`.
  - [x] Zonas: la zona de una unidad se copia a la misma letra de los pisos con la misma planta.
  - [~] Imágenes reales (`npm run imagenes:mirador`, carpeta `demo-mirador/` fuera del repo): cargadas fachada (horizontal 16:9), plantas, maqueta y ambientes de la tipología 1 (2026-11-19); faltan t2 y t3. Polígonos de pisos y unidades medidos sobre las imágenes reales (el seed los aplica).
  - Verificado: typecheck, lint, build, 58 unitarios y 49 de base. E2E no corridos en esta etapa.

## Pendientes técnicos

- La imagen para compartir (OG) pesa ~1 MB: WhatsApp suele no mostrar vistas previas de más de ~300 KB. Bajarla (JPEG/menos resolución de la foto) antes de la entrega.
- Probar con datos reales apenas haya Supabase: panel completo (login, subida de fotos/360°/PDF, hotspots, invitaciones), inicio, filtros, ficha, mapa, consulta, OG, tour (hotspots, giroscopio en iPhone), planos (pellizco) y todo el circuito de pre-visita.

## Pendientes del usuario

- Opcional: SMTP propio (ej. Resend) para invitar agentes y usar los mails en español.
- Cuando compre el dominio de la plataforma: SETUP-CUENTAS paso 6 (Vercel + Supabase + DOMINIO_BASE).
- obraiq-temp: se borró `supabase/.temp/` (caché de la CLI creada al arrancar esta obra, sin project-ref). `.claude/settings.local.json` es un archivo de ObraIQ al que esa sesión le sumó permisos: no se tocó (se puede revertir con `git checkout` en ese repo si el usuario quiere).
