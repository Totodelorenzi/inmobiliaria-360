# Prompt original: retomar inmobiliaria-360

Estás retomando un proyecto que quedó a medias porque se cortó la sesión anterior. Tu primer trabajo es reconstruir el contexto, ordenar la carpeta y dejar todo documentado para que cualquier sesión futura pueda retomar sin perder nada. Después seguís construyendo.

## 0. AISLAMIENTO (regla más importante)

- El proyecto vive SOLO en: `C:\Users\Mi PC\inmobiliaria-360`
- En la sesión anterior la terminal volvía sola a `C:\Users\Mi PC\obraiq-temp`. Eso NO puede pasar. En cada comando usá rutas absolutas o hacé cd a la carpeta del proyecto en el mismo comando. La ruta tiene un espacio ("Mi PC"): siempre entre comillas.
- Prohibido crear, modificar o borrar archivos en obraiq-temp, ObraIQ o cualquier otra carpeta. Prohibido tocar repos, proyectos de Supabase o de Vercel existentes.
- Revisá con `git -C 'C:\Users\Mi PC\obraiq-temp' status --short` si la sesión anterior dejó archivos sueltos ahí que sean de este proyecto. NO los borres: listámelos y yo decido.

## 1. ESTADO CONOCIDO AL MOMENTO DEL CORTE

- Proyecto creado con create-next-app: Next.js 16.3.6, React 19.2.8, TypeScript strict, Tailwind 4, ESLint 9, App Router, carpeta src/, alias @/*. Git inicializado. Existen AGENTS.md (reglas oficiales de Next) y CLAUDE.md con "@AGENTS.md".
- Todavía no se escribió código propio. Se estaba leyendo la documentación de Next 16 en node_modules/next/dist/docs/.
- Aprendizajes de Next 16 ya confirmados: middleware ahora es proxy.ts, params y searchParams son asíncronos, revalidateTag pide un segundo argumento. Ante cualquier API dudosa, consultá la doc puntual de node_modules/next/dist/docs/, no la leas entera.
- Versiones verificadas: @supabase/ssr 0.12.7, @supabase/supabase-js 2.117.2, pannellum 2.5.7, tailwindcss 4.3.3.
- Entorno: Windows, PowerShell, Node 24.15.0, npm 11.12.1, git 2.45. NO hay Docker (no se puede levantar Supabase local). Git ya autentica contra GitHub con el administrador de credenciales de Windows.
- Cuentas: GitHub CLI (gh) NO instalado. Vercel CLI no instalado y su token guardado venció. Supabase CLI funciona con npx pero sin login. Los MCP de Supabase y Vercel NO están disponibles en esta sesión: no dependas de ellos, usá las CLI.
- Yo no uso servidor de desarrollo local para revisar: reviso en los deploys de Vercel. Vos sí podés correr build, lint, tests y dev local para verificar tu trabajo.

## 2. PRIMERAS TAREAS (en este orden)

**A)** Auditá la carpeta: git status, git log, package.json, estructura de src/. Confirmá que el estado coincide con lo de arriba. Si algo está a medias o roto, arreglalo.

**B)** Creá estos archivos de documentación (cortos, concretos, sin relleno):

- `CLAUDE.md`: mantené la primera línea "@AGENTS.md" y debajo agregá las reglas de la sección 3 de este documento, más un bloque "Contexto del proyecto" de 10 líneas máximo y un puntero a docs/.
- `docs/SPEC.md`: la especificación completa de la sección 5, tal cual.
- `docs/PROGRESO.md`: checklist de etapas (sección 4) con estado [ ] / [x] / [~] y una línea de "Próximo paso". Actualizalo al cerrar cada etapa.
- `docs/DECISIONES.md`: una línea por decisión técnica tomada (qué y por qué).
- `docs/SETUP-CUENTAS.md`: la guía paso a paso de la sección 6.
- `.env.example` con todas las variables y comentarios; `.env.local` con valores PLACEHOLDER (ignorado por git).

Hacé commit: "docs: contexto, reglas y guía de configuración". Este archivo (docs/PROMPT-ORIGINAL.md) también va en el commit.

**C)** Mostrame el contenido de docs/SETUP-CUENTAS.md en el chat para que yo lo vaya haciendo en paralelo mientras vos seguís construyendo. NO esperes mi respuesta: seguí con la etapa siguiente.

## 3. REGLAS DE TRABAJO (van también en CLAUDE.md)

### Eficiencia y tokens

- No releas archivos que ya leíste en la sesión salvo que hayan cambiado. Para archivos grandes, buscá con grep y leé solo el rango necesario.
- Recortá salidas largas: npm con --no-fund --no-audit --loglevel=error; logs y listados con Select-Object -First/-Last o head/tail; nunca vuelques package-lock ni carpetas enteras.
- Para cambios chicos editá la parte puntual; no reescribas archivos completos.
- Durante una etapa verificá solo lo que tocaste (tsc y eslint sobre esos archivos); el build completo y los tests, al cerrar cada etapa.
- Nada de explicaciones largas en el chat. Al cerrar cada etapa: máximo 5 líneas (qué quedó, qué se verificó, próximo paso).
- Mínimas dependencias: preferí librerías mantenidas y livianas; no agregues una librería para algo que se resuelve en 20 líneas.

### Decisiones

- Decidí vos con criterio profesional y registralo en docs/DECISIONES.md. No me preguntes cosas que podés resolver.
- Si la especificación choca con la documentación de Next 16 o de una librería, gana la documentación y lo anotás.
- Si algo de la especificación es claramente mejorable (más simple, más robusto, más rápido), hacelo mejor y anotalo.
- Frená y preguntame SOLO para: logins en mi navegador, pagos, permisos de cuentas o cualquier acción que afecte algo fuera de esta carpeta. Cuando frenes, dame instrucciones paso a paso para un usuario no técnico: dónde hacer clic, qué copiar, dónde pegarlo y cómo verificar que salió bien.

### Orden y resiliencia

- Commit al terminar cada etapa (y en medio si la etapa es larga), con mensajes descriptivos en español.
- Actualizá docs/PROGRESO.md en cada commit, así si la sesión se corta, la próxima retoma leyendo CLAUDE.md y docs/PROGRESO.md.
- Secretos: nunca en el repo. La service role key de Supabase y la contraseña del admin solo en .env.local y en las variables de Vercel. Nunca en código de cliente.

## 4. ETAPAS

Construí todo lo posible sin cuentas, con placeholders, y frená solo en los puntos marcados como BLOQUEO.

1. **Base:** dependencias, estructura de carpetas, clientes de Supabase (navegador, servidor y admin solo servidor) leyendo variables validadas en src/lib/env.ts con mensajes claros si faltan, proxy.ts protegiendo /admin, layout, sistema de diseño (tokens, tipografías, componentes base).
2. **Base de datos:** migraciones SQL en supabase/migrations con el esquema, RLS, buckets de Storage y sus políticas. Como no hay Docker, validá el SQL y las políticas RLS con PGlite en tests automáticos (tests/db/). Tipos de TypeScript escritos a mano en src/types/database.ts, para regenerarlos después desde el proyecto real.
3. **Web pública completa** (sección 5).
4. **Visores:** tour 360° con Pannellum y visor de planos.
5. **Panel /admin completo.**
6. **Seed:** scripts/seed.ts (panorámicas CC0 de Poly Haven, planos SVG generados por vos), scripts/create-admin.ts, botón "Borrar datos de ejemplo".
7. **Calidad local:** tsc, eslint y next build limpios con placeholders; tests Playwright escritos (iPhone y escritorio) y corriendo lo que se pueda sin base real; tests de RLS con PGlite pasando.
   - **BLOQUEO A:** necesito Supabase configurado (SETUP-CUENTAS pasos 1 y 2). Verificá con "npx supabase projects list". Si ya está, seguí.
8. **Supabase real:** link, db push de migraciones, Storage, seed, admin, regenerar tipos con supabase gen types, tests contra la base real.
   - **BLOQUEO B:** necesito repo en GitHub y Vercel logueado (SETUP-CUENTAS pasos 3 y 4).
9. **Deploy:** push a GitHub, proyecto de Vercel conectado a main, variables de entorno de producción y preview, deploy. Revisá errores con "npx vercel logs" e inspect.
10. **Calidad en producción:** Playwright contra la URL de producción, Lighthouse mobile ≥90 en inicio y ficha (Performance, Accessibility, Best Practices, SEO), prueba de RLS real (anónimo no escribe, otra agencia no ve borradores), búsqueda de secretos en el repo. Corregí hasta que todo pase.
11. **Entrega:** README en español y resumen final (sección 7).

## 5. ESPECIFICACIÓN DEL PRODUCTO (copiala a docs/SPEC.md)

**Contexto:** web para inmobiliarias de Argentina, cada una con su web propia con propiedades en alquiler y venta, incluidas propiedades en construcción o en pozo. Diferencial: tour virtual 360° armado con panorámicas que saca la inmobiliaria (una por ambiente, cámara 360 o panorámica de celular), y planos navegables para propiedades en construcción. Objetivo: que la inmobiliaria solo tenga que cargar fotos 360° o planos y salir a ofrecer la propiedad.

**Idioma:** español rioplatense ("vos", Alquiler, Venta, Ambientes, Expensas, Consultar).

**Diseño:** mobile-first, moderno, con identidad propia, color principal configurable por inmobiliaria. Los botones de tour y planos son el elemento más llamativo de la ficha: grandes, ancho completo en mobile, acento amarillo #FFC83D con texto oscuro, con ícono.

**Stack:** Next.js 16 App Router, TypeScript estricto, Tailwind 4, Supabase (Postgres, Auth, Storage) con @supabase/ssr, Pannellum, deploy en Vercel. White-label: todos los datos de la inmobiliaria salen de la base.

### Modelo de datos

- **agencies:** id, nombre, logo_url, color_primario, whatsapp, email, telefono, direccion, instagram, facebook, created_at.
- **agency_members:** user_id, agency_id, rol ('admin' | 'agente').
- **properties:** id, agency_id, titulo, slug (único), operacion ('alquiler'|'venta'), tipo (departamento, casa, PH, local, terreno, oficina, cochera), estado_obra ('terminada'|'en_construccion'|'en_pozo'), fecha_entrega, avance_obra_pct, precio, moneda ('ARS'|'USD'), expensas, acepta_financiacion, detalle_financiacion, apto_credito, direccion, mostrar_direccion_exacta, barrio, ciudad, lat, lng, ambientes, dormitorios, banos, superficie_total, superficie_cubierta, cochera, amenities (text[]), descripcion, destacada, publicada, es_demo (para el borrado de datos de ejemplo), created_at, updated_at.
- **property_photos:** id, property_id, url, thumb_url, orden, es_principal.
- **tour_scenes:** id, property_id, nombre_ambiente, panorama_url, thumb_url, orden, yaw_inicial, pitch_inicial.
- **tour_hotspots:** id, scene_id, target_scene_id, yaw, pitch, texto.
- **property_plans:** id, property_id, nombre, url, thumb_url, orden, tipo_original ('imagen'|'pdf').
- **plan_hotspots:** id, plan_id, x_pct, y_pct, texto, scene_id (nullable).
- **leads:** id, agency_id, property_id, nombre, telefono, email, mensaje, origen ('formulario'|'whatsapp_click'), created_at.

RLS en todas las tablas: el público lee solo propiedades publicadas y datos de agencia; solo miembros autenticados escriben los datos de su agencia; el público solo inserta leads. Storage: lectura pública para fotos, panorámicas y planos; escritura solo para miembros.

### Web pública

1. **Inicio:** header con logo y WhatsApp; hero con buscador por barrio, calle o tipo; selector fijo Alquiler/Venta con contador; secciones separadas "En alquiler" y "En venta" con "Ver todas"; sección "Emprendimientos en construcción" si hay; tarjetas clickeables enteras (foto, operación, precio "USD 95.000" o "$ 450.000/mes", expensas, dirección y barrio, chips de ambientes, dormitorios, baños, m²; badges "Tour 360°", "Planos", "En pozo" o "En construcción, entrega mes/año"); footer con contacto y redes.
2. **Listados /alquiler, /venta, /emprendimientos:** filtros (tipo, precio, ambientes, barrio, con tour, apto crédito, estado de obra) y orden, sincronizados con la URL.
3. **Ficha /propiedad/[slug]:** galería de 1 o 2 fotos grandes con swipe y "Ver todas las fotos"; precio, expensas, operación, título y dirección arriba; botón grande "Recorrer la propiedad en 360°" si hay tour y "Ver planos" si hay planos (tour primero); bloque de obra (estado, entrega, barra de avance, financiación); ficha técnica con íconos, amenities, descripción; mapa Leaflet/OpenStreetMap exacto o zona aproximada; formulario de consulta que guarda un lead; barra fija en mobile con precio y "Consultar por WhatsApp" (wa.me con mensaje precargado, registra lead 'whatsapp_click'); Open Graph con imagen dinámica por propiedad; propiedades relacionadas.
4. **Tour /propiedad/[slug]/tour:** pantalla completa y link compartible; Pannellum multi-escena; hotspots y barra de miniaturas con nombres; cerrar, pantalla completa, autorrotación hasta el primer toque, giroscopio (con permiso en iOS), pellizco para zoom; carga por escena y precarga de la siguiente; WhatsApp flotante.
5. **Planos /propiedad/[slug]/planos:** visor a pantalla completa con zoom y paneo táctil, selector entre planos, puntos con nombre y, si tienen escena asociada, botón para abrir el tour en ese ambiente.
6. 404 propia, sitemap dinámico, robots, metadatos SEO, JSON-LD schema.org en cada propiedad.

### Panel /admin (pensado para usarse desde el celular)

- Login, recuperación de contraseña, rutas protegidas con proxy.ts.
- Dashboard: propiedades publicadas, leads de la semana, accesos "Cargar propiedad" y "Ver leads".
- Propiedades: listado con buscador y filtros; editar, duplicar, publicar/despublicar, destacar, eliminar con confirmación, "Ver en la web".
- Alta/edición en 5 pasos (datos, fotos, tour, planos, revisar y publicar) con autoguardado como borrador, slug automático y validaciones claras.
- Fotos: subida múltiple, cámara del celular, reordenar, elegir principal; compresión en el cliente (máx. 2400 px, WebP o JPG ~80), miniatura, HEIC a JPG, progreso por archivo y reintento.
- Tour: una panorámica por ambiente, nombrar y reordenar, validación 2:1 con aviso claro, compresión a máx. 6000 px; editor visual de hotspots (tocar un punto, elegir destino, guardar yaw/pitch); "Usar esta vista como inicial"; "Previsualizar tour".
- Planos: imágenes o PDF (convertido a imagen por página con pdf.js en el cliente), nombrar, editor de puntos vinculables a escenas.
- Leads: listado, responder por WhatsApp, exportar CSV.
- Configuración de la inmobiliaria con vista previa del color en vivo.
- Usuarios: invitar agentes por email.
- Ayuda: "Cómo sacar las fotos 360°" y "Cómo cargar los planos".

### Datos de ejemplo

Una inmobiliaria y 9 propiedades (4 alquiler, 3 venta terminadas, 2 en pozo o construcción) con precios coherentes en ARS y USD; 2 con tour completo de 3-4 escenas con hotspots (panorámicas CC0 de Poly Haven subidas por el script); 1 en pozo con 2 planos con puntos; botón "Borrar datos de ejemplo" que elimina lo marcado es_demo; usuario admin inicial con contraseña segura generada, guardada solo en .env.local.

### Calidad

TypeScript, ESLint y build sin errores ni warnings; Playwright en iPhone y escritorio cubriendo inicio, filtros, ficha, tour, planos, consulta, login, alta completa de propiedad y verla publicada; Lighthouse mobile ≥90; accesibilidad (contraste, alt, foco visible, botones ≥44 px); estados vacíos, de carga y de error con mensajes útiles; pruebas de RLS; sin secretos en el repo.

## 6. GUÍA DE CONFIGURACIÓN DE CUENTAS (para docs/SETUP-CUENTAS.md)

Escribila para un usuario no técnico, en Windows, con pasos numerados, qué copiar, dónde pegarlo y cómo verificar cada paso. Incluí:

1. **Supabase:** crear una organización nueva solo para este proyecto (así no se mezcla con ObraIQ y no choca con el límite de 2 proyectos gratis por organización); crear el proyecto "inmobiliaria-360" en región São Paulo; guardar la contraseña de la base; dónde encontrar Project URL, anon/publishable key, service role/secret key y project ref; dónde pegarlos en .env.local.
2. **Supabase CLI:** correr "npx supabase login" en PowerShell desde la carpeta del proyecto y verificar con "npx supabase projects list".
3. **GitHub:** sin instalar nada extra, crear desde github.com un repo privado vacío "inmobiliaria-360" (sin README ni .gitignore) y pasarme la URL. Vos lo conectás con git remote y push, que ya autentica en esta PC.
4. **Vercel:** "npx vercel login" y verificar con "npx vercel whoami"; si al conectar el repo Vercel no lo ve, cómo darle acceso desde GitHub (Settings → Applications → Vercel → Configure).
5. **Configuración de Auth en Supabase:** Site URL y Redirect URLs con la URL de Vercel (esto va después del primer deploy; indicá cuándo).

Al final de cada paso, indicá qué escribirte en el chat para que sigas (por ejemplo: "listo paso 1").

## 7. ENTREGA FINAL

Resumen con: URL de producción y repo; usuario y contraseña del admin; resultados de tests y Lighthouse; guía corta para que un agente cargue su primera propiedad real (fotos, tour y planos); cómo conectar un dominio propio en Vercel; cómo replicar la web para otra inmobiliaria; pendientes para mí, si hay. README en español con todo eso y las decisiones técnicas.

**Arrancá por la sección 2A.**
