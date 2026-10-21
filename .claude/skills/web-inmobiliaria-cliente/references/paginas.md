# Páginas

## Contenido

1. Mapa del sitio
2. Header y footer
3. Home
4. Listado
5. Emprendimiento
6. Asesores
7. Vender o tasar
8. Nosotros y contacto
9. Privacidad, 404 y estados especiales
10. Páginas opcionales

La ficha de propiedad, la tarjeta y el recorrido están en [ficha-y-recorrido.md](ficha-y-recorrido.md).

## 1. Mapa del sitio

Rutas base (seguí el patrón de rutas del proyecto si ya existe uno):

- `/` home
- `/propiedades` listado, con filtros en la URL (o rutas por operación como `/venta` y `/alquiler`)
- `/propiedades/{slug}` ficha
- `/emprendimientos` y `/emprendimientos/{slug}`, si el cliente vende proyectos
- `/asesores/{slug}`, si hay más de un asesor; con uno solo, su bloque va en Nosotros
- `/vender` tasación y captación
- `/nosotros`, `/contacto`, `/privacidad` y la página 404

Opcionales: `/barrios/{slug}` y `/proximos-ingresos`.

## 2. Header y footer

**Header:**
- Logo con link a la home.
- Navegación corta con solo lo que el cliente vende: Comprar, Alquilar, Emprendimientos, Vender, Nosotros.
- Botón de WhatsApp siempre visible. En mobile, menú simple y el mismo botón.
- Fondo neutro y sin banners que compitan con las propiedades.

**Footer:**
- Logo, teléfono, WhatsApp, email, dirección y horarios.
- Matrícula del corredor responsable, tal como la informa el cliente.
- Redes, link a /privacidad y el crédito discreto "Hecho con {plataforma}" de la configuración global.

## 3. Home

Orden por defecto, ajustable por perfil. Cada sección tiene que pasar la prueba de descubrir, entender o contactar.

1. **Hero por intención**, según [perfiles.md](perfiles.md).
2. **Destacadas o próximos ingresos**, seis como máximo, con link al listado.
3. **Perfiles de búsqueda:** tarjetas que abren búsquedas ya filtradas (primera vivienda o apto crédito, para invertir, alquilar, lotes) y colecciones automáticas por etiqueta, solo si al menos 3 propiedades cumplen cada una.
4. **Por qué esta inmobiliaria:** hasta tres datos reales y verificables (años en la ciudad, operaciones, zona que conoce) y el equipo con fotos reales.
5. **Captación:** "¿Querés vender o alquilar tu propiedad?" con link a `/vender`. Si el recorrido está activo para el cliente, mencioná el informe de interés que recibe el propietario.
6. **Historias de clientes**, solo reales y con permiso (opcional).
7. **Cierre:** un CTA claro y el footer.

## 4. Listado

- **Filtros a la vista:** operación, tipo, zona o barrio y precio. En alquiler, precio mensual con la opción de incluir expensas.
- **Más filtros:** ambientes, dormitorios, baños, cochera, apto crédito, apto profesional, mascotas, amenities y superficie. Mostrá solo filtros para los que la cartera tiene datos.
- **Resultados:** contador, orden (más recientes, menor precio, mayor precio), chips de filtros activos que se pueden quitar y filtros reflejados en la URL para compartir y medir.
- **Tarjetas:** las de [ficha-y-recorrido.md](ficha-y-recorrido.md).
- **Captación intercalada:** una sola tarjeta "¿Tenés una propiedad para vender o alquilar?" después de la sexta tarjeta.
- **Guardar búsqueda:** "Avisame cuando entre algo así", por WhatsApp o email, con consentimiento.
- **Sin resultados:** nunca un callejón. Mensaje, pedido de búsqueda corto (qué busca, zona, presupuesto, WhatsApp) y una sugerencia de qué filtro aflojar.
- **Paginación** o carga incremental, conservando la posición al volver desde una ficha.
- **Mapa** opcional, útil cuando la cartera es grande.

## 5. Emprendimiento

1. **Hero:** render rotulado o foto de obra, nombre, ubicación, entrega estimada, tipologías y precio "desde" si lo informan.
2. **Avance de obra:** línea de tiempo con fechas y fotos reales de cada etapa.
3. **Tipologías:** plano real de cada una, con m² y orientación. Recorrido de la unidad modelo si existe.
4. **Disponibilidad:** grilla por piso o por unidad con estados (disponible, reservada, vendida) y filtro por tipología. Cada unidad abre su mini ficha.
5. **Amenities y ubicación.**
6. **Financiación**, solo si el cliente la informa, con sus condiciones textuales.
7. **Folleto en PDF** a cambio de nombre y WhatsApp, con consentimiento.
8. **Formulario** para comprador o inversor, con la pregunta "¿Para vivir o para invertir?".

## 6. Asesores

- Foto real, nombre, rol, matrícula como la informa el cliente, WhatsApp y teléfono.
- Biografía breve, zonas o especialidades e idiomas.
- Propiedades activas a su cargo.
- Operaciones o reseñas solo si son reales.
- "Tu asesor": cuando un visitante consulta, ese asesor queda asignado y aparece en las fichas que siga viendo, si el proyecto lo soporta.

## 7. Vender o tasar

- **Propuesta para el propietario:** tasación profesional, fotos ordenadas por ambiente, recorrido virtual cuando está activo, difusión y, cuando la plataforma lo genera, un informe de interés con datos reales de quienes vieron su propiedad.
- **Formulario:** dirección o zona, tipo, ambientes, m² aproximados, estado, operación (vender o alquilar), plazo, nombre y WhatsApp.
- **Sin tasación automática con números inventados.** La tasación la hace la inmobiliaria.
- **Plazo de respuesta** solo si el cliente se compromete a uno.

## 8. Nosotros y contacto

**Nosotros:** historia breve y real, equipo con fotos, oficina (dirección, horario, mapa), matrícula y link a reseñas reales.

**Contacto:** WhatsApp, teléfono, email, dirección con mapa, horarios con "Abierto ahora" o "Cerrado" calculado en la zona horaria del cliente (por defecto `America/Argentina/Buenos_Aires`) y un formulario corto.

## 9. Privacidad, 404 y estados especiales

- **/privacidad:** qué datos se recogen (contacto y actividad en la web, incluido el recorrido), para qué se usan, quién es responsable (la inmobiliaria), cómo pedir acceso, corrección o baja, y un contacto. Es un texto base: el cliente debe validarlo con su asesor legal.
- **404 con la marca:** buscador y link a propiedades.
- **Propiedad vendida o alquilada:** la ficha sigue accesible con su estado y muestra propiedades parecidas. Los links viejos de WhatsApp o portales no terminan en un error.

## 10. Páginas opcionales

- **Próximos ingresos:** propiedades que el cliente carga antes de publicarlas en portales, visibles para quienes se registran con nombre, WhatsApp y qué buscan.
- **Barrios:** propiedades activas del barrio y un texto breve con datos verificados. Nada de escuelas, distancias ni precios promedio inventados.
- **Historias de clientes:** casos reales con permiso, contados por la familia o el inversor.
