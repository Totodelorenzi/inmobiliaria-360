# Ficha, tarjeta y recorrido

## Contenido

1. Tarjeta de propiedad
2. Ficha: orden y estructura
3. La ficha como página de aterrizaje
4. CTA contextual
5. Módulo de recorrido
6. Galería y planos
7. WhatsApp

## 1. Tarjeta de propiedad

- Foto 4:3 (3:2 en premium) con la cantidad de fotos. Sobre la foto, solo badges de estado o atributos reales.
- Precio en la moneda publicada, o "Consultar precio". En alquiler, el total mensual con expensas cuando se conocen.
- Título concreto con carácter (ver [contenido-y-copy.md](contenido-y-copy.md)).
- Barrio o zona y una fila estructurada de atributos: ambientes, dormitorios, baños, m² cubiertos y totales.
- De 3 a 4 puntos fuertes en el perfil local; opcional en premium.
- Indicador "Recorrido 360" si la propiedad lo tiene y el switch está activo.
- Toda la tarjeta navega a la ficha; favorito y WhatsApp conservan su propia acción.
- Hover sutil (cambio de foto o de borde), sin animaciones llamativas.

## 2. Ficha: orden y estructura

Orden en mobile:

1. **Medios:** pestañas Recorrido, Fotos, Planos y Mapa, solo las que existen. Con el recorrido activo, su portada es la primera vista: foto del ambiente principal, botón "Hacer el recorrido" y cantidad de ambientes.
2. **Precio** o "Consultar precio", línea de costo real (expensas o total mensual) y estado.
3. **Título**, ubicación y fila de atributos.
4. **Barra fija inferior** con WhatsApp y el CTA contextual.
5. **Menú interno** en chips: Recorrido, Fotos, Planos, Descripción, Detalles, Costos, Ubicación, Asesor, Similares, solo los que existen.
6. **Fotos por ambiente**, agrupadas con el rótulo como encabezado.
7. **Planos** reales, con m² por ambiente si se conocen.
8. **Descripción-recorrido.**
9. **Detalles** en tabla: superficies cubierta, semicubierta, descubierta y total; lote; ambientes; dormitorios; baños; toilette; cochera; antigüedad; estado; orientación; expensas; servicios; apto crédito; apto profesional; mascotas; disponibilidad.
10. **Costos.** En venta: precio, expensas y gastos estimados de compra solo si el cliente define un porcentaje, aclarando que es orientativo. En alquiler: alquiler más expensas igual a total mensual, depósito, honorarios y ajuste (índice y frecuencia) tal como los informe el cliente.
11. **Ubicación:** mapa exacto o aproximado según la configuración de la propiedad, y distancias a puntos de referencia cargados por el cliente o calculados con una fuente identificable.
12. **Frase del asesor**, si el módulo está activo y es real.
13. **Asesor:** foto, nombre, matrícula, WhatsApp y "Coordinar visita".
14. **Similares** por precio, tipo y zona, y "Más en {barrio}".
15. **Pie de ficha:** código de propiedad, "Actualizado hace X días" y aviso de imágenes (renders o IA) si aplica.

```
Mobile
┌──────────────────────────────┐
│ ◂ Propiedades          Logo  │  header liviano
├──────────────────────────────┤
│ [Recorrido] Fotos Planos Mapa│
│   Portada del recorrido      │
│   ▶ Hacer el recorrido       │
│   8 ambientes                │
├──────────────────────────────┤
│ USD 145.000       Disponible │
│ Expensas $ 85.000 por mes    │
│ Casa con quincho y patio     │
│ de 300 m² cerca del parque   │
│ Barrio, Ciudad               │
│ 4 amb   3 dorm   2 baños     │
│ 160 m² cub   410 m² lote     │
├──────────────────────────────┤
│ chips: Recorrido Fotos ...   │
│ secciones                    │
├──────────────────────────────┤
│ [WhatsApp]  [Hacer recorrido]│  barra fija
└──────────────────────────────┘

Escritorio
┌─────────────────────────────────────────────────────────┐
│ Logo   Comprar  Alquilar  Vender  Nosotros   [WhatsApp] │
├─────────────────────────────────────────────────────────┤
│       Medios a ancho completo (recorrido o galería)      │
├──────────────────────────────────┬──────────────────────┤
│ Título, ubicación, atributos     │ USD 145.000          │
│ Menú interno fijo                │ Disponible           │
│ Fotos por ambiente               │ [Hacer el recorrido] │
│ Planos                           │ [WhatsApp]           │
│ Descripción-recorrido            │ Asesor y matrícula   │
│ Detalles, costos, ubicación      │ Fija al hacer scroll │
├──────────────────────────────────┴──────────────────────┤
│ Similares          Más en este barrio                    │
└─────────────────────────────────────────────────────────┘
```

## 3. La ficha como página de aterrizaje

- Header liviano con la marca y un link al listado, más migas de pan (Inicio, Venta, Casas, Barrio).
- Si la visita llega desde el QR del cartel (`src=cartel`), la ficha abre en la portada del recorrido.
- Al final siempre hay salida: similares y un link a todas las propiedades.
- Vista previa al compartir según [seo-y-datos.md](seo-y-datos.md).

## 4. CTA contextual

El contacto nunca se bloquea. Lo que cambia según el recorrido es qué botón es el primario.

| Situación | CTA primario | Secundario |
|---|---|---|
| Sin recorrido o con el 360 apagado | Coordinar visita | Consultar por WhatsApp |
| Recorrido activo, todavía no iniciado | Hacer el recorrido | Consultar por WhatsApp, y "Coordinar visita" como link de texto |
| Recorrido completo (umbral configurable, 80 % de los ambientes por defecto, o evento de fin del visor) | Coordinar visita, con día y franja horaria preferidos | Consultar por WhatsApp |

- Guardá en el navegador, de forma anónima, el avance del recorrido por propiedad, para que la jerarquía se mantenga cuando el visitante vuelve.
- Cuando el visitante ya completó el recorrido, el mensaje de WhatsApp lo dice, para que el asesor sepa que es un interesado tibio o caliente.

## 5. Módulo de recorrido

Un único componente para todos los clientes; cada mejora aplica a todas las webs.

- **Entrada evidente:** portada con foto, botón "Hacer el recorrido" y cantidad de ambientes. En las tarjetas, el indicador "Recorrido 360".
- **Carga diferida:** el visor se descarga recién al abrirlo. La ficha carga primero la foto y los datos.
- **Pantalla completa en mobile**, con "Volver a la ficha" siempre visible y regreso a la misma posición de scroll.
- **Navegación por ambientes:** lista o mini plano si existe, con el nombre del ambiente actual visible. Plano sincronizado solo si es fiel.
- **Estados:** cargando (esqueleto con la foto de portada), error (mensaje y acceso a las fotos) y sin soporte (fotos como alternativa).
- **Contacto dentro del recorrido:** botón de WhatsApp que menciona el ambiente actual, y una pantalla final con "Coordinar visita".
- **Accesibilidad:** controles con nombre accesible, manejo del foco al abrir y al cerrar, salida con Escape.
- **Eventos:** los de [medicion-y-leads.md](medicion-y-leads.md). Antes de construir, verificá qué emite el visor del proyecto. Si es un iframe de un proveedor sin API de eventos, registrá solo apertura y cierre y avisalo en el reporte.
- **Switch del panel:** con el 360 apagado, el módulo no se renderiza y no deja espacio vacío.

## 6. Galería y planos

**Galería:**
- Foto principal y mosaico. Al abrir, visor con deslizamiento, contador, rótulo del ambiente y navegación por teclado.
- Fotos agrupadas por ambiente, en el orden del recorrido.
- Renders, amoblado virtual e imágenes con IA llevan el rótulo sobre la foto.

**Planos:**
- Imagen o SVG del plano real, con zoom. Si hay varias plantas, una pestaña por planta.
- m² por ambiente solo si se conocen. Nunca un plano dibujado sin relevamiento.

## 7. WhatsApp

- Link: `https://wa.me/{numero}?text={mensaje codificado con encodeURIComponent}`.
- Número en formato internacional sin "+", espacios ni guiones. Celulares de Argentina: 54, luego 9, el código de área sin el 0 y el número sin el 15. Ejemplo: 0221 15 456-7890 pasa a 5492214567890.
- Plantilla del mensaje:

```
Hola {nombreAsesor}, vi {tipo} en {barrio} (código {codigo}) en la web de {inmobiliaria}.{ yaRecorrio ? " Ya hice el recorrido virtual." : "" } Quiero {accion}. {url}
```

- Acciones según el botón: "más información", "coordinar una visita", "saber más sobre el {ambiente}" desde el recorrido.
- Cada clic registra `whatsapp_click` con propiedad, asesor y ubicación del botón. El texto del mensaje no se guarda.
