# Inmobiliaria 360 · Pre-visita digital para inmobiliarias

Plataforma white-label para inmobiliarias y constructoras de Argentina. Cada inmobiliaria tiene su web (alquiler, venta y emprendimientos en pozo) con **tour 360°** y **planos navegables**, y un panel pensado para el celular. Además de mostrar propiedades, **califica a los interesados**: registra qué recorrió cada uno, le asigna un puntaje y le entrega al vendedor leads con historial, para que dedique su tiempo a quienes ya conocen la propiedad.

## Direcciones

| Qué | Dónde |
|---|---|
| Web de la demo | https://inmobiliaria-360-kohl.vercel.app/?agencia=horizonte |
| Panel (todas las inmobiliarias) | https://inmobiliaria-360-kohl.vercel.app/admin |
| Repositorio (privado) | https://github.com/Totodelorenzi/inmobiliaria-360 |

Mientras la plataforma no tenga dominio propio, cada web se ve con `?agencia=<subdominio>`. Con dominio (ver más abajo), cada inmobiliaria queda en `<subdominio>.tudominio` o en su dominio propio, y el panel en `app.tudominio`.

## Acceso de administrador

- **Usuario:** el mail que está en `ADMIN_EMAIL` dentro de `.env.local`.
- **Contraseña:** la línea `ADMIN_PASSWORD` de `.env.local` (generada al azar; nunca se sube al repositorio).
- Ese usuario es administrador de la inmobiliaria demo y **superadmin de la plataforma** (sección *Plataforma* del panel).
- Para cambiar la contraseña: usá "¿Olvidaste tu contraseña?" en el login, o reemplazá `ADMIN_PASSWORD` en `.env.local` y corré `npm run crear-admin`.

**Usuario para presentaciones:** `DEMO_EMAIL` / `DEMO_PASSWORD` en `.env.local`. Es agente de la inmobiliaria demo: ve inicio, propiedades, leads (puntaje, historial, pedidos de visita) y estadísticas, pero no configuración ni usuarios. Se crea o se resetea con `npm run crear-usuario-demo`. Antes de una presentación, `npm run demo:actualizar-fechas` trae la actividad de ejemplo al presente (si no, "Leads calientes de la semana" puede salir vacío). Si la base está pausada por inactividad (plan gratis, 7 días sin uso), hay que reactivarla desde supabase.com antes.

## Calidad (al 2026-10-11)

- **Tests automáticos:** 51 unitarios y 38 de base de datos (seguridad por fila, aislamiento entre inmobiliarias, datos de ejemplo) en verde. De punta a punta (Playwright, iPhone y computadora): 48/48 en local y 44/44 contra producción (los 4 tests de multi-inmobiliaria por subdominio se activan en producción cuando haya dominio real).
- **Seguridad:** RLS en todas las tablas, verificada contra la base real; el asesor de seguridad de Supabase sin observaciones; sin secretos en el repositorio.
- **Lighthouse mobile** (demo en producción, medido en una PC con CPU 2× calibrada):

  | Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
  |---|---|---|---|---|
  | Inicio | 72–86 | 100 | 100 | 100 |
  | Ficha | 73–83 | 100 | 100 | 100 |
  | Tour 360° | 74–80 | 100 | 100 | 100 |
  | Privacidad (mismo esqueleto, sin fotos) | 97 | 100 | 100 | 100 |

  La foto principal aparece en 1 a 2 segundos y la página no salta (CLS 0). Lo que falta para 90 en esas tres páginas está en *Pendientes*. La medición oficial se hace en https://pagespeed.web.dev.

## Guía rápida: cargar la primera propiedad real

Desde el celular o la computadora, en el panel → **Propiedades** → **Cargar propiedad**. El alta tiene 5 pasos y todo se guarda solo:

1. **Datos:** operación (alquiler en pesos y venta en dólares se eligen solos), tipo, título, precio, ubicación (buscá la dirección y ajustá el pin), ambientes, metros, amenities y descripción.
2. **Fotos:** podés sacarlas con la cámara del celular o subirlas de la galería (también fotos HEIC de iPhone). Se comprimen solas. Ordenalas con las flechas y marcá la principal con la estrella.
3. **Tour 360°:** una foto 360° por ambiente (cámara Insta360, Ricoh Theta o una app de "fotos esféricas"). Tiene que ser el doble de ancha que de alta (por ejemplo 6000×3000): si no lo es, el panel avisa. Sacala con todas las luces prendidas, desde el centro del ambiente, a la altura de los ojos y con trípode. Subilas en el orden del recorrido, ponele nombre a cada una y tocá las puertas para conectar los ambientes. Con "Usar esta vista como inicial" elegís hacia dónde mira cada uno al abrirse.
4. **Planos:** el PDF del arquitecto o una imagen. Cada página del PDF queda como un plano. Tocá sobre el plano para marcar los ambientes y, si tienen foto 360°, vinculalos: en la web aparece "Ver en 360°".
5. **Publicar:** revisá la lista de requisitos y tocá **Publicar**. Con "Ver en la web" la ves como un cliente.

Para mandarla a un interesado: **Leads** → **Generar link de pre-visita**. El link registra todo lo que recorre esa persona y lo vas a ver en su ficha de lead.

## Dar de alta otra inmobiliaria

No hace falta otro deploy ni otra base. En el panel → **Plataforma** → **Nueva inmobiliaria**: nombre, subdominio, color, WhatsApp y el mail del dueño, que recibe una invitación como administrador. Desde ahí carga su logo y sus propiedades. Para que la invitación llegue a mails que no sean de tu cuenta de Supabase hace falta el servicio de mails propio (paso 7 de la guía).

## Conectar dominios

- **Dominio de la plataforma** (una sola vez): `docs/SETUP-CUENTAS.md`, paso 6. Se compra, se conecta a Vercel y se carga `DOMINIO_BASE`.
- **Dominio propio de una inmobiliaria** (ej. `umbralpropiedades.com.ar`): panel → **Plataforma** → la inmobiliaria → **Dominio propio** → Guardar. El panel muestra los registros DNS exactos para cargar donde se compró el dominio. Si en Vercel está configurado `VERCEL_API_TOKEN`, el dominio se agrega solo al proyecto. Si no, el panel muestra los pasos manuales.
- **Mails en español desde tu dominio:** `docs/SETUP-CUENTAS.md`, paso 7 (Resend).

## Pendientes

- Comprar el dominio de la plataforma (paso 6) y configurar Resend (paso 7): hasta entonces, las invitaciones solo llegan a los mails de tu cuenta de Supabase.
- Velocidad: miniaturas de 400 px en WebP para las tarjetas y una panorámica de 4096 px para celulares, para llevar inicio, ficha y tour a 90 (requiere regenerar las imágenes).
- Medir con PageSpeed oficial (la API sin clave no tiene cupo; desde pagespeed.web.dev funciona).
- Pasar Vercel a Pro cuando se cobre a inmobiliarias (el plan gratis es para uso no comercial).
- Que un abogado revise el texto de `/privacidad` (Ley 25.326).

---

## Para desarrolladores

**Stack:** Next.js 16 (App Router, `src/`), React 19, TypeScript estricto, Tailwind 4, Supabase (Postgres, Auth, Storage) con `@supabase/ssr`, Pannellum para el tour, Vercel (región São Paulo).

**Cómo funciona por dentro**

- **Multi-inmobiliaria:** `src/proxy.ts` resuelve la inmobiliaria por el host (`src/lib/tenancy.ts`) y reescribe a `/s/[sitio]/...`, así la caché de cada web queda separada. El panel está en `src/app/admin` (un solo host central). Las rutas `/api/*`, `/v/*` y las acciones de formularios resuelven el sitio por el host, nunca con datos del navegador.
- **Seguridad:** RLS en todas las tablas (`supabase/migrations`), permisos por columna, funciones de RLS en el esquema `private`. La clave secreta solo se usa en el servidor, después de verificar permisos.
- **Pre-visita:** tracking propio y first-party (`src/lib/tracking`), puntaje en `src/lib/scoring.ts`, línea de tiempo en `src/lib/previsita`.

**Comandos**

```
npm run dev            # desarrollo en http://localhost:3000 (elegí la web con ?agencia=horizonte)
npm run typecheck      # tipos
npm run lint           # ESLint
npm test               # unitarios + base de datos (PGlite, sin Docker)
npm run build          # build de producción
npm run test:e2e       # Playwright contra el build local (o E2E_BASE_URL=https://… para producción)
npm run seed           # datos de ejemplo (inmobiliaria "horizonte")
npm run crear-admin    # admin inicial y superadmin, con ADMIN_EMAIL/ADMIN_PASSWORD de .env.local
npx supabase db push   # migraciones a la base real
```

**Variables:** ver `.env.example`. En Vercel van solo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y, cuando corresponda, `DOMINIO_BASE`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.

**Regla de los tests:** la base es una sola. Los tests que escriben lo hacen solo en una inmobiliaria de prueba propia de cada corrida (`es_test`), que se crea y se borra entera. La limpieza pasa por una protección que aborta ante cualquier otra inmobiliaria. Detalle en `CLAUDE.md`.

**Documentación:** `docs/SPEC.md` (producto), `docs/DECISIONES.md` (cada decisión técnica y por qué), `docs/PROGRESO.md` (estado), `docs/SETUP-CUENTAS.md` (cuentas, dominios y mails paso a paso).
