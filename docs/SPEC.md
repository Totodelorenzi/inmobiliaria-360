# Especificación del producto

> Copia fiel de la sección 5 de docs/PROMPT-ORIGINAL.md. Cambios de criterio: ver docs/DECISIONES.md.

**Contexto:** web para inmobiliarias de Argentina, cada una con su web propia con propiedades en alquiler y venta, incluidas propiedades en construcción o en pozo. Diferencial: tour virtual 360° armado con panorámicas que saca la inmobiliaria (una por ambiente, cámara 360 o panorámica de celular), y planos navegables para propiedades en construcción. Objetivo: que la inmobiliaria solo tenga que cargar fotos 360° o planos y salir a ofrecer la propiedad.

**Idioma:** español rioplatense ("vos", Alquiler, Venta, Ambientes, Expensas, Consultar).

**Diseño:** mobile-first, moderno, con identidad propia, color principal configurable por inmobiliaria. Los botones de tour y planos son el elemento más llamativo de la ficha: grandes, ancho completo en mobile, acento amarillo #FFC83D con texto oscuro, con ícono.

**Stack:** Next.js 16 App Router, TypeScript estricto, Tailwind 4, Supabase (Postgres, Auth, Storage) con @supabase/ssr, Pannellum, deploy en Vercel. White-label: todos los datos de la inmobiliaria salen de la base.

## Modelo de datos

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
