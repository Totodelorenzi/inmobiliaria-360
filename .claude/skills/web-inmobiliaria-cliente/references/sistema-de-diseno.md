# Sistema de diseño

## Contenido

1. Dos capas
2. Plan de diseño
3. Tokens
4. Componentes base
5. Movimiento
6. Defaults genéricos a evitar
7. Terminación

## 1. Dos capas

- **Sistema base, igual para todos:** estructura de páginas, componentes, comportamiento, medición, accesibilidad y rendimiento.
- **Identidad, propia de cada cliente:** tokens de color y tipografía, radios, tratamiento de fotos, tono, composición del hero y módulos del perfil.

Un cliente nuevo cambia tokens, contenido y módulos; no se reescriben componentes. Si un cliente necesita algo que no existe, se agrega como variante del sistema base, así la mejora queda disponible para todos.

## 2. Plan de diseño

Antes de escribir código, armá un plan corto:

- **Color:** 4 a 6 hex con nombre, con un solo color de firma.
- **Tipografía:** familias y rol de cada una.
- **Layout:** una frase por concepto y un wireframe ASCII del hero y de la ficha, con la alineación decidida.
- **Elemento memorable:** el único lugar donde se gasta la audacia. En inmobiliarias suele ser la fotografía y la entrada al recorrido.

Después revisalo: si alguna parte es lo que harías para cualquier inmobiliaria y no para esta, cambiala y anotá por qué. Contrastalo con el registro de diseño del proyecto y con la sección 6.

Las referencias del cliente (logo, capturas de Instagram, fotos de su cartera y de su oficina) son la materia prima. La distinción sale de ahí: la ciudad, el tipo de propiedades, cómo hablan, qué colores ya reconoce su clientela.

## 3. Tokens

Seguí la estructura de `assets/tema-cliente.example.json` y llevala al mecanismo que use el proyecto (variables CSS, tema de Tailwind, fila de configuración del cliente en Supabase).

### Color

| Token | Uso |
|---|---|
| marca | Color de firma: acciones principales, acentos, foco de marca |
| marcaContraste | Texto o íconos sobre el color de marca |
| tinta | Texto principal |
| tintaSuave | Texto secundario |
| fondo | Fondo general |
| superficie | Bloques y paneles sobre el fondo |
| borde | Divisiones y bordes de controles |
| foco | Anillo de foco visible |
| estado.disponible / reservada / vendida | Badges de estado, discretos, sin competir con la marca |

- El color de firma es el que la clientela ya asocia con la marca: sacalo del logo y del Instagram. Un segundo color solo si la marca ya lo tiene.
- Los neutros acompañan la temperatura de las fotos de la cartera (cálidos o fríos).
- Contraste mínimo: 4.5:1 para texto normal y 3:1 para texto grande, íconos y bordes de controles. Verificalo con `scripts/contraste.mjs`.
- Si la marca no llega a 4.5:1 sobre el fondo (pasa con amarillos, celestes o verdes claros), usala como superficie o acento y resolvé texto y botones con una variante oscura derivada.

### Tipografía

- Una o dos familias. Si son dos, que se distingan claramente (display y texto).
- Escala con ratio 1.2 para alquileres y local, hasta 1.333 para premium. Cuerpo de 16 a 18 px en mobile. Interlineado 1.5 en sans y 1.6 en serif. Líneas de menos de 75 caracteres.
- Cargá las fuentes con el mecanismo del framework (por ejemplo `next/font`), con subset latino y `font-display: swap`.

### Espaciado, radios y sombras

- Escala de espaciado: 4, 8, 12, 16, 24, 32, 48, 64 y 96 px. Entre secciones, 64 a 96 en escritorio y 48 a 64 en mobile.
- Dos radios: uno para controles (botones, campos) y otro para medios (fotos, tarjetas). Pueden ser distintos; un único radio en todo es señal de plantilla.
- Sombras solo para capas que flotan: barra fija, menú, modal. Las tarjetas se separan con espacio y superficie, no con la misma sombra repetida.

### Fotos e íconos

- Proporciones fijas por uso: tarjeta 4:3 (3:2 en premium), hero 16:9 en escritorio y 4:5 en mobile, galería mixta.
- Mismo tratamiento de color en todas. Nunca recortar lo importante de una propiedad: usá foco o posición del encuadre.
- Una sola familia de íconos con trazo consistente. Los atributos van como ícono, número y unidad.

## 4. Componentes base

- **Botones:** primario (uno por vista), secundario y WhatsApp. Estados de hover, foco, deshabilitado y cargando. Alto mínimo de 44 px.
- **Badges:** solo estados o atributos reales: Nueva, Reservada, Vendida, Alquilada, Exclusiva, Apto crédito, Render, Amoblado virtual, Imagen con IA.
- **Barra de contacto fija en la ficha mobile:** WhatsApp y el CTA contextual. No tapa contenido: el final de la página tiene el espacio necesario.
- **Formularios:** pocos campos, teclado correcto para cada dato (tel, email), validación en línea y mensajes que dicen cómo resolver el problema.
- **Esqueletos de carga** para listado, galería y recorrido.

## 5. Movimiento

- El movimiento responde a una acción: abrir la galería, entrar al recorrido, aplicar filtros, confirmar un envío.
- Como mucho, un momento orquestado por sitio, por ejemplo la transición de la portada del recorrido a pantalla completa.
- Nada de fundidos en cada sección, scroll secuestrado, parallax pesado ni video pesado en reproducción automática.
- Entre 150 y 250 ms, con curva de salida. Con `prefers-reduced-motion`, las transiciones son instantáneas.

## 6. Defaults genéricos a evitar

Son legítimos si la marca realmente es así; el problema es usarlos porque sí.

- Fondo crema con serif de alto contraste y acento terracota; fondo casi negro con un único acento neón.
- Todo cortado en tarjetas idénticas redondeadas con la misma sombra suave, y degradés como decoración.
- Etiquetas en mayúsculas sostenidas sobre cada título, flecha "→" pegada a cada botón, numeración 01 / 02 / 03 sin una secuencia real.
- Atributos unidos con puntos medios en una sola cadena ("3 amb · 2 dorm · 1 baño"): usá una fila estructurada de ícono, número y unidad.
- Blobs, mockups de celulares flotando, fondos con ruido decorativo.
- Fotos de stock (llaves en la mano, apretones de manos, familias sonriendo): solo fotos reales de la cartera, la oficina y el equipo.
- Textos vacíos como "la casa de tus sueños", "tu hogar ideal", "calidad y confianza" o "somos líderes".

## 7. Terminación

Lo que separa una web que parece cara de una plantilla:

- Un solo elemento memorable y todo lo demás disciplinado. Antes de cerrar, sacá un accesorio.
- Contenido real en todas las pantallas. Cero lorem ipsum o fotos de muestra al entregar.
- Detalles que no fallan: precio, plano, estado y asesor correctos en cada ficha.
- Estados diseñados: vacío, error, carga, sin resultados y 404 con la marca.
- Vista previa cuidada al compartir por WhatsApp: foto, título y precio.
- Favicon e íconos con la marca, textos alternativos útiles.
- Microcopy coherente: la acción se llama igual en el botón y en la confirmación.
- Revisión con capturas en mobile y en escritorio antes de dar algo por terminado.
