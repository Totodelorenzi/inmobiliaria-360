# Especificación del producto

## Posicionamiento

El producto es una herramienta de **pre-visita digital** para inmobiliarias y constructoras. No solo muestra propiedades: filtra y califica a los interesados. El comprador recorre fotos, planos y tour 360° antes de pedir una visita presencial; la herramienta registra su comportamiento y le entrega al vendedor leads calificados, con historial y puntaje, para que invierta su tiempo solo en quienes ya conocen la propiedad y tienen intención concreta.

> "Contexto" a "Calidad": especificación original (sección 5 de docs/PROMPT-ORIGINAL.md). "Pre-visita y calificación": cambio de alcance del 2026-10-06. "Plataforma multi-inmobiliaria": cambio del 2026-10-09. Cambios de criterio: docs/DECISIONES.md.

**Contexto:** web para inmobiliarias de Argentina, cada una con su web propia con propiedades en alquiler y venta, incluidas propiedades en construcción o en pozo. Diferencial: tour virtual 360° armado con panorámicas que saca la inmobiliaria (una por ambiente, cámara 360 o panorámica de celular), y planos navegables para propiedades en construcción. Objetivo: que la inmobiliaria solo tenga que cargar fotos 360° o planos y salir a ofrecer la propiedad.

**Idioma:** español rioplatense ("vos", Alquiler, Venta, Ambientes, Expensas, Consultar).

**Diseño:** mobile-first, moderno, con identidad propia, color principal configurable por inmobiliaria. Los botones de tour y planos son el elemento más llamativo de la ficha: grandes, ancho completo en mobile, acento amarillo #FFC83D con texto oscuro, con ícono.

**Stack:** Next.js 16 App Router, TypeScript estricto, Tailwind 4, Supabase (Postgres, Auth, Storage) con @supabase/ssr, Pannellum, deploy en Vercel. White-label: todos los datos de la inmobiliaria salen de la base.

## Modelo de datos

- **agencies:** id, nombre, subdominio (único), dominio_propio (opcional, único), logo_url, color_primario, whatsapp, email, telefono, direccion, instagram, facebook, created_at.
- **agency_members:** user_id, agency_id, rol ('admin' | 'agente').
- **properties:** id, agency_id, titulo, slug (único por inmobiliaria), operacion ('alquiler'|'venta'), tipo (departamento, casa, PH, local, terreno, oficina, cochera), estado_obra ('terminada'|'en_construccion'|'en_pozo'), fecha_entrega, avance_obra_pct, precio, moneda ('ARS'|'USD'), expensas, acepta_financiacion, detalle_financiacion, apto_credito, direccion, mostrar_direccion_exacta, barrio, ciudad, lat, lng, ambientes, dormitorios, banos, superficie_total, superficie_cubierta, cochera, amenities (text[]), descripcion, destacada, publicada, es_demo (para el borrado de datos de ejemplo), created_at, updated_at.
- **property_photos:** id, property_id, url, thumb_url, orden, es_principal.
- **tour_scenes:** id, property_id, nombre_ambiente, panorama_url, thumb_url, orden, yaw_inicial, pitch_inicial.
- **tour_hotspots:** id, scene_id, target_scene_id, yaw, pitch, texto.
- **property_plans:** id, property_id, nombre, url, thumb_url, orden, tipo_original ('imagen'|'pdf').
- **plan_hotspots:** id, plan_id, x_pct, y_pct, texto, scene_id (nullable).
- **leads:** id, agency_id, property_id, nombre, telefono, email, mensaje, origen ('formulario'|'whatsapp_click'), created_at.

RLS en todas las tablas: el público lee solo propiedades publicadas y datos de agencia; solo miembros autenticados escriben los datos de su agencia; el público solo inserta leads. Storage: lectura pública para fotos, panorámicas y planos; escritura solo para miembros.

## Web pública

1. **Inicio:** header con logo y WhatsApp; hero con buscador por barrio, calle o tipo; selector fijo Alquiler/Venta con contador; secciones separadas "En alquiler" y "En venta" con "Ver todas"; sección "Emprendimientos en construcción" si hay; tarjetas clickeables enteras (foto, operación, precio "USD 95.000" o "$ 450.000/mes", expensas, dirección y barrio, chips de ambientes, dormitorios, baños, m²; badges "Tour 360°", "Planos", "En pozo" o "En construcción, entrega mes/año"); footer con contacto y redes.
2. **Listados /alquiler, /venta, /emprendimientos:** filtros (tipo, precio, ambientes, barrio, con tour, apto crédito, estado de obra) y orden, sincronizados con la URL.
3. **Ficha /propiedad/[slug]:** galería de 1 o 2 fotos grandes con swipe y "Ver todas las fotos"; precio, expensas, operación, título y dirección arriba; botón grande "Recorrer la propiedad en 360°" si hay tour y "Ver planos" si hay planos (tour primero); bloque de obra (estado, entrega, barra de avance, financiación); ficha técnica con íconos, amenities, descripción; mapa Leaflet/OpenStreetMap exacto o zona aproximada; formulario de consulta que guarda un lead; barra fija en mobile con precio y "Consultar por WhatsApp" (wa.me con mensaje precargado, registra lead 'whatsapp_click'); Open Graph con imagen dinámica por propiedad; propiedades relacionadas.
4. **Tour /propiedad/[slug]/tour:** pantalla completa y link compartible; Pannellum multi-escena; hotspots y barra de miniaturas con nombres; cerrar, pantalla completa, autorrotación hasta el primer toque, giroscopio (con permiso en iOS), pellizco para zoom; carga por escena y precarga de la siguiente; WhatsApp flotante.
5. **Planos /propiedad/[slug]/planos:** visor a pantalla completa con zoom y paneo táctil, selector entre planos, puntos con nombre y, si tienen escena asociada, botón para abrir el tour en ese ambiente.
6. 404 propia, sitemap dinámico, robots, metadatos SEO, JSON-LD schema.org en cada propiedad.

## Panel /admin (pensado para usarse desde el celular)

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

## Datos de ejemplo

Una inmobiliaria y 9 propiedades (4 alquiler, 3 venta terminadas, 2 en pozo o construcción) con precios coherentes en ARS y USD; 2 con tour completo de 3-4 escenas con hotspots (panorámicas CC0 de Poly Haven subidas por el script); 1 en pozo con 2 planos con puntos; botón "Borrar datos de ejemplo" que elimina lo marcado es_demo; usuario admin inicial con contraseña segura generada, guardada solo en .env.local.

## Calidad

TypeScript, ESLint y build sin errores ni warnings; Playwright en iPhone y escritorio cubriendo inicio, filtros, ficha, tour, planos, consulta, login, alta completa de propiedad y verla publicada; Lighthouse mobile ≥90; accesibilidad (contraste, alt, foco visible, botones ≥44 px); estados vacíos, de carga y de error con mensajes útiles; pruebas de RLS; sin secretos en el repo.

## Pre-visita y calificación (cambio de alcance 2026-10-06)

### Modelo de datos

- **visitors:** id (uuid anónimo en cookie first-party), agency_id, first_seen, last_seen, utm_source, utm_medium, utm_campaign, tracked_link_id (nullable).
- **visitor_events:** id, visitor_id, agency_id, property_id, tipo ('view_property' | 'photo_view' | 'tour_start' | 'scene_view' | 'tour_complete' | 'plan_view' | 'plan_point_click' | 'whatsapp_click' | 'form_submit' | 'visit_request' | 'share'), scene_id o plan_id (nullable), duracion_ms, meta (jsonb), created_at.
- **leads** (se agrega): visitor_id, codigo_ref (código corto único, ej. "A7K2"), score (0-100), nivel ('frio' | 'tibio' | 'caliente'), estado ('nuevo' | 'contactado' | 'visita_agendada' | 'descartado' | 'cerrado'), notas.
- **visit_requests:** id, lead_id, property_id, franja_preferida, forma_pago ('contado' | 'credito_hipotecario' | 'financiacion' | 'no_sabe'), plazo ('inmediato' | '1_3_meses' | '3_6_meses' | 'mas_6_meses'), necesita_vender (bool), presupuesto_aprox (nullable), comentario, created_at.
- **tracked_links:** id, agency_id, property_id, codigo (corto, único), nombre_prospecto, telefono_prospecto, creado_por, created_at.
- RLS: el público no lee ninguna de estas tablas. Eventos y pedidos de visita entran solo por route handlers del servidor, con validación del payload, límite de tasa por visitante e IP y descarte de eventos inválidos. Solo los miembros de la agencia leen sus datos.

### Tracking (sin analytics de terceros)

- Cliente liviano en `src/lib/tracking/`: genera o recupera el visitante, acumula eventos y los envía en lotes con `navigator.sendBeacon` cada ~10 s y al ocultar la página.
- Tiempo por escena del tour y por plano medido solo con la pestaña visible.
- "tour_complete" = vio al menos el 80% de las escenas y acumuló al menos 60 s en el tour (configurable en un solo archivo).
- Visitas repetidas: sesiones distintas por visitante y propiedad.

### Unión del historial con el lead

- Al enviar el formulario o pedir visita se crea o actualiza el lead con el visitante y queda asociado todo su historial previo.
- WhatsApp: el mensaje precargado incluye "Ref. XXXX" (codigo_ref). Al tocar el botón se crea un lead provisorio con ese código y el visitante. En el panel, un buscador por código muestra el historial completo.
- Links personalizados: `/v/[codigo]` registra el tracked_link en el visitante y redirige a la ficha. Si el prospecto después deja datos, se une solo.

### Pedido de visita (nuevo llamado principal)

- Al completar el tour aparece "Pedir visita presencial": formulario de 4 preguntas como máximo (forma de pago, plazo, necesita vender, franja horaria) más nombre y teléfono. También accesible desde la ficha.
- WhatsApp queda como opción secundaria.

### Puntaje

- Reglas transparentes en `src/lib/scoring.ts` con los pesos en un solo objeto (terminó el tour, tiempo total, vio planos, visitas repetidas, pidió visita, forma de pago definida, plazo inmediato o corto…). Se recalcula con cada evento relevante.
- Se guarda el desglose para mostrar el "por qué" en el panel (ej.: "Terminó el tour, 2 visitas, crédito, compra en 1 a 3 meses").
- Tests unitarios del scoring.

### Panel

- Leads ordenados por puntaje, con nivel en color, estado editable, notas, filtro por propiedad y nivel, y búsqueda por código de referencia.
- Detalle del lead: datos, respuestas de calificación, desglose del puntaje y línea de tiempo de actividad.
- Por propiedad: vistas, tours iniciados y completados, tiempo promedio, planos vistos, pedidos de visita y conversión.
- Dashboard: leads calientes de la semana arriba de todo.
- "Generar link de pre-visita": nombre y teléfono del prospecto; genera el link y lo copia o lo abre en WhatsApp con un mensaje listo. En el lead se ve si lo abrió y qué recorrió.

### Privacidad

- Página `/privacidad` con aviso conforme a la Ley 25.326 de Protección de Datos Personales: qué se registra, para qué, quién lo ve y cómo pedir la baja.
- Aviso breve y no invasivo en la primera visita, y casilla de consentimiento en el formulario y en el pedido de visita. Criterio aplicado: ver DECISIONES.md.

### Datos de ejemplo

- El seed genera visitantes y eventos realistas de las últimas 3 semanas y unos 15 leads repartidos entre frío, tibio y caliente, con historiales creíbles, algunos pedidos de visita y un par de links personalizados. El panel tiene que verse lleno y convincente para una demo. Todo marcado como demo para que el botón de borrado lo elimine.

### Tests de punta a punta

- Recorrer el tour completo, pedir visita, verificar que el lead aparece con puntaje e historial en el panel, y el flujo de link personalizado.

## Plataforma multi-inmobiliaria (cambio 2026-10-09)

### Arquitectura

- Una sola aplicación y una sola base para todas las inmobiliarias. La web pública y el panel están separados.
- **Web pública** de cada inmobiliaria en `<subdominio>.<DOMINIO_BASE>` o en su dominio propio. La inmobiliaria se detecta por el host en `proxy.ts`, que reescribe a `/s/<sitio>/...`: la caché de Next (páginas, datos, imagen para compartir, sitemap, robots) queda separada por inmobiliaria. Las rutas `/s/...` no se pueden pedir desde afuera.
- Host que no corresponde a ninguna inmobiliaria: página neutra de la plataforma (404 en rutas de sitio).
- **Panel central** en `app.<DOMINIO_BASE>` para todas. `/admin` desde el dominio de una inmobiliaria redirige al panel.
- **Hosts de prueba** (localhost, vistas previas `*.vercel.app` y la URL `*.vercel.app` de producción mientras no haya `DOMINIO_BASE`): la inmobiliaria se elige con `?agencia=<subdominio>` (queda en una cookie). En un dominio real el parámetro se ignora.
- Cookie de visitante por host (sin atributo `domain`): nunca se comparte entre inmobiliarias.

### Panel

- Selector de inmobiliaria para quien tiene varias membresías. La activa se guarda en una cookie y se valida en el servidor en cada pedido contra `agency_members`; RLS es la barrera final.
- "Ver en la web", "Ver el sitio" y los links de pre-visita usan el dominio real de la inmobiliaria (dominio propio o subdominio), tomado de la base.
- **Plataforma** (superadmin, tabla `platform_admins`): alta de inmobiliarias (nombre, subdominio validado y único, color, WhatsApp, mail del dueño que recibe la invitación como admin) y dominio propio con instrucciones de DNS. Con `VERCEL_API_TOKEN` y `VERCEL_PROJECT_ID`, el dominio se agrega al proyecto de Vercel por la API.

### Auth y mails

- La Site URL de Supabase Auth es el panel central: todos los mails (invitación, recuperar contraseña) llevan al panel.

### Tests

- Dos inmobiliarias de prueba: cada host muestra solo su web, aunque tengan el mismo slug.
- Usuario con dos membresías cambia de inmobiliaria y ve sus datos.
- Usuario de A no opera sobre B aunque manipule la cookie o la API.
- `/admin` desde el dominio de una inmobiliaria redirige al panel central.
