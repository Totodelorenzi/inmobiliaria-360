---
name: web-inmobiliaria-cliente
description: Crea, rediseña, amplía o audita la web de un cliente de la plataforma (inmobiliaria, constructora o desarrolladora, administración de alquileres) con su propia marca y pre-visita digital. Cubre home, listado y filtros, ficha de propiedad con recorrido 360 y planos, emprendimientos, asesores, tasaciones, WhatsApp, captura y calificación de leads por comportamiento, SEO y control de calidad. Usala siempre que haya que armar la web de un cliente nuevo, adaptar el diseño a su marca o a su Instagram, agregar o cambiar secciones, fichas, tarjetas, CTAs, el módulo de recorrido o la medición de eventos, o revisar una web de cliente antes de publicar, aunque no se nombre la skill.
---

# Web de cliente inmobiliario

Cada cliente recibe una web con su marca que presenta sus propiedades al nivel de una inmobiliaria líder y funciona como pre-visita digital: el recorrido y la actividad del visitante califican al comprador antes de la visita presencial. Toda decisión responde a tres trabajos:

- que el visitante descubra, entienda y contacte;
- que el asesor reciba interesados con contexto;
- que el dueño de la inmobiliaria vea el valor en su panel y en sus números.

## Reglas que se cumplen siempre

1. **Marca blanca.** El comprador ve solo la marca del cliente. La plataforma aparece únicamente como un "Hecho con {plataforma}" discreto en el footer, tomado de la configuración global del proyecto, nunca escrito a mano por cliente.
2. **Nada inventado.** Precios, superficies, planos, reseñas, testimonios, estadísticas, años de trayectoria y distancias salen de datos reales. Si un dato falta, el bloque no se muestra y queda como pendiente en el reporte. Sin precio publicado: "Consultar precio".
3. **Cada sección se gana su lugar:** ayuda a descubrir una propiedad, entenderla o contactar. Si no cumple ninguna de las tres, se saca.
4. **Mobile primero y la ficha como puerta de entrada.** Mucho tráfico llega directo a una ficha desde WhatsApp, Instagram, un portal o el QR del cartel. La ficha presenta a la inmobiliaria y ofrece el siguiente paso sin depender de la home.
5. **Fotos rotuladas por ambiente** y ordenadas como un recorrido. El rótulo alimenta galería, planos, recorrido y medición. Usá el vocabulario de [contenido-y-copy.md](references/contenido-y-copy.md).
6. **Los medios aparecen solo si existen.** Las pestañas Recorrido, Fotos, Planos y Mapa se arman según el contenido cargado. Con el 360 apagado desde el panel, la ficha se ve completa, sin huecos.
7. **El contacto nunca se bloquea.** Toda ficha tiene WhatsApp con mensaje precargado (código, título y link) y la consulta llega al asesor responsable de esa propiedad. El recorrido cambia la jerarquía de los botones, no su disponibilidad.
8. **Medir solo lo que pasa.** Eventos en dos capas, interacción y conversión. Si el visor no reporta eventos por ambiente, no se simulan: se registran apertura y cierre y se avisa en el reporte, porque la calificación por ambiente es justamente lo que se le vende al cliente.
9. **Consentimiento explícito** en todo registro: qué datos y qué actividad se usan (incluido el recorrido), para qué, y link a /privacidad (Ley 25.326).
10. **Transparencia.** Rótulo visible en renders, amoblado virtual e imágenes generadas o editadas con IA. Estados al día: una reservada o vendida nunca figura como disponible.
11. **Piso de calidad.** Contraste AA, foco visible, navegación por teclado, texto alternativo con el ambiente, áreas táctiles de 44 px, `prefers-reduced-motion` respetado, imágenes optimizadas y recorrido con carga diferida.
12. **Si hay un diseño aprobado** (por ejemplo, de Claude Design), ese diseño manda en lo visual. Esta skill aporta estructura, conversión, medición y QA, y señala los conflictos con estas reglas antes de implementar.

## Flujo

### Paso 0. Reconocer el proyecto (siempre, antes de crear archivos)

Relevá el stack, la estructura, cómo se separa cada cliente (dominio o subdominio, configuración en Supabase, carpeta por cliente), dónde viven los tokens de tema, qué componentes existen (tarjeta, ficha, galería, visor), las tablas de propiedades, asesores, leads y eventos, el switch del 360 y el flujo de deploy en Vercel. Reutilizá lo que existe en vez de crear sistemas paralelos. Proponé y esperá confirmación antes de migraciones, cambios de esquema o borrados. Ubicá la configuración global de la plataforma (nombre y link para el crédito del footer); si no existe, proponé dónde crearla. Leé `docs/clientes/registro-diseno.md` y crealo si no existe. Si el proyecto ya tiene otras convenciones de carpetas o nombres, seguí esas.

### Paso 1. Brief

Completá la plantilla [brief-cliente.md](assets/brief-cliente.md) en `docs/clientes/{slug}/brief.md` con lo que haya dado el usuario. Pedí de una sola vez solo lo que bloquea; el resto queda en "Pendientes". Para Instagram pedí capturas y el logo en archivo; no intentes scrapear.

### Paso 2. Perfil

Elegí premium, local generalista, desarrolladora o alquileres con [perfiles.md](references/perfiles.md). Si el cliente mezcla, el perfil principal define la composición y se suman los módulos del otro.

### Paso 3. Plan de diseño (antes de escribir código)

Con [sistema-de-diseno.md](references/sistema-de-diseno.md) definí la paleta (4 a 6 hex con nombre y un solo color de firma), las tipografías y sus roles, el concepto de hero y de ficha con un wireframe ASCII, y el elemento memorable. Guardá los tokens en `docs/clientes/{slug}/tema.json` siguiendo [tema-cliente.example.json](assets/tema-cliente.example.json) y después llevalos al mecanismo de temas del proyecto.

Revisá el plan contra el registro de diseño (no repitas la combinación de otro cliente de la misma ciudad) y contra la lista de defaults genéricos; corregí lo que suene a plantilla. Verificá el contraste:

    node "${CLAUDE_SKILL_DIR}/scripts/contraste.mjs" docs/clientes/{slug}/tema.json

Mostrá el plan y esperá el OK del usuario, salvo que haya pedido avanzar directo.

### Paso 4. Construir

Armá las páginas según [paginas.md](references/paginas.md); la ficha, la tarjeta y el recorrido según [ficha-y-recorrido.md](references/ficha-y-recorrido.md); los textos según [contenido-y-copy.md](references/contenido-y-copy.md). Los datos del cliente viven en su configuración o en la base, nunca dentro de los componentes.

### Paso 5. Conversión y medición

Implementá eventos, resumen para el asesor, señales de calificación, ruteo y consentimiento según [medicion-y-leads.md](references/medicion-y-leads.md).

### Paso 6. SEO y vista previa

Configurá metadatos, JSON-LD y vista previa para WhatsApp según [seo-y-datos.md](references/seo-y-datos.md).

### Paso 7. QA

Recorré [checklist-qa.md](references/checklist-qa.md) completo. Si el proyecto no usa servidor local, corré build o typecheck cuando el entorno lo permita, empujá a una rama y revisá el preview de Vercel, también en un celular real.

### Paso 8. Cierre

Actualizá el registro de diseño, generá `docs/clientes/{slug}/entrega.md` con [entrega-cliente.md](assets/entrega-cliente.md) y reportá al usuario qué se construyó, qué decisiones tomaste, qué datos faltan del cliente y cómo salió el QA.

## Otros modos

- **Auditoría** ("revisá la web de X"): no cambies código. Pasá el checklist y las reglas de arriba y devolvé los hallazgos por prioridad (crítico si rompe una regla que se cumple siempre, importante, mejora), con archivo y ubicación.
- **Cambio puntual** ("agregá emprendimientos", "cambiá el hero"): hacé un Paso 0 breve, leé solo la referencia afectada, aplicá el cambio y corré el QA de lo que tocaste.

## Por defecto y opcional

**Por defecto** (se aplica salvo que el brief diga lo contrario):

- Hero por intención: frase "Estoy buscando…" o pestañas Comprar / Alquilar / Tasar, según el perfil.
- Tarjetas de perfil que abren búsquedas ya filtradas, y colecciones automáticas por etiqueta cuando al menos 3 propiedades la cumplen.
- Filtros con revelación progresiva.
- Títulos de aviso concretos y con carácter, más 3 o 4 puntos fuertes por tarjeta.
- Descripción escrita como recorrido.
- Precio traducido a costo real: alquiler más expensas, "Apto crédito" solo si el cliente lo confirma, gastos de compra solo con el porcentaje que defina el cliente.
- "Coordinar visita" que gana protagonismo al completar el recorrido.
- Similares y "más en este barrio" al pie de cada ficha. Una propiedad vendida o alquilada muestra parecidas en vez de un 404.
- Guardar búsqueda y alertas; pedido de búsqueda en el estado sin resultados.
- Captación de propiedades en tres puntos: menú Vender, tarjeta intercalada en el listado y bloque en la home.
- Señales de confianza con datos reales: años, operaciones, reseñas, matrícula, horario, "actualizado hace X días".
- QR por propiedad para el cartel, con el origen medido.
- JSON-LD y vista previa cuidada para WhatsApp.

**Opcional** (solo si el brief lo activa y hay contenido real):

- Próximos ingresos visibles solo para registrados.
- Frase del asesor o del dueño en la ficha.
- Audio-guía del recorrido.
- Comparar por ambiente ("ver todas las cocinas").
- Páginas por barrio y comparador de barrios.
- Historias de clientes.
- Informe de mercado periódico.
- Búsqueda en lenguaje natural.
- Mapa con dibujo de zona en el listado.
- Conversión de moneda.

## Referencias

| Archivo | Leelo cuando |
|---|---|
| [perfiles.md](references/perfiles.md) | Elegís el perfil o definís composición, densidad y tipografía |
| [sistema-de-diseno.md](references/sistema-de-diseno.md) | Armás el plan, los tokens, los componentes base o revisás la terminación |
| [paginas.md](references/paginas.md) | Construís o cambiás home, listado, emprendimientos, asesores, vender, nosotros, contacto, footer o privacidad |
| [ficha-y-recorrido.md](references/ficha-y-recorrido.md) | Tocás la ficha, la tarjeta, la galería, los planos, el recorrido o WhatsApp |
| [contenido-y-copy.md](references/contenido-y-copy.md) | Escribís cualquier texto: títulos, descripciones, CTAs, estados vacíos o datos con formato |
| [medicion-y-leads.md](references/medicion-y-leads.md) | Implementás eventos, leads, ruteo, calificación o consentimiento |
| [seo-y-datos.md](references/seo-y-datos.md) | Configurás metadatos, sitemap, JSON-LD u Open Graph |
| [checklist-qa.md](references/checklist-qa.md) | Antes de publicar o al auditar |
| [brief-cliente.md](assets/brief-cliente.md), [tema-cliente.example.json](assets/tema-cliente.example.json), [entrega-cliente.md](assets/entrega-cliente.md) | Plantillas de brief, tokens y entrega |
