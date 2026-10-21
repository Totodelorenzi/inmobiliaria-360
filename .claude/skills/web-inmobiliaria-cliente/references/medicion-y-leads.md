# Medición y leads

El objetivo es doble: que el asesor reciba cada consulta con contexto (qué vio, cuánto tiempo, si terminó el recorrido) y que el dueño de la inmobiliaria vea el valor (consultas calificadas, visitas mejor preparadas, interés por propiedad).

## Contenido

1. Antes de implementar
2. Eventos en dos capas
3. Reglas de registro
4. Resumen para el asesor
5. Señales de calificación
6. Ruteo
7. Consentimiento
8. Métricas para el dueño

## 1. Antes de implementar

- Revisá si el proyecto ya tiene tablas o un servicio de eventos y de leads. Si existen, usá sus nombres y su esquema: esta referencia es el contrato mínimo, no un reemplazo.
- Toda la web registra a través de un solo helper, por ejemplo `track(evento, propiedades)`, compartido por todos los clientes.
- Cambios de esquema o tablas nuevas: proponelos y esperá confirmación.

## 2. Eventos en dos capas

**Interacción**

| Evento | Cuándo |
|---|---|
| `page_view` | Cada página, con `page_type` (home, listado, ficha, emprendimiento, asesor, vender, contacto) |
| `search` | Se aplican filtros |
| `search_no_results` | Una búsqueda sin resultados |
| `listing_view` | Se abre una ficha |
| `gallery_open` / `photo_view` | Se abre la galería o se ve una foto, con el ambiente |
| `plan_view` | Se abre un plano |
| `tour_open` | Se abre el recorrido, con el origen (portada, pestaña, tarjeta, QR) |
| `tour_room_enter` / `tour_room_exit` | Entrada y salida de un ambiente, con tiempo de permanencia; solo si el visor lo emite |
| `tour_complete` | Se alcanza el umbral configurable (80 % de los ambientes por defecto) o el visor emite su evento de fin |
| `tour_close` | Se cierra el recorrido, con último ambiente y duración |
| `audio_play` | Se reproduce la audio-guía (opcional) |
| `map_view`, `share_click`, `favorite_add` | Mapa, compartir y favorito |
| `qr_landing` | La visita llega con `src=cartel` |

**Conversión**

| Evento | Cuándo |
|---|---|
| `whatsapp_click` | Clic en WhatsApp, con propiedad, asesor y ubicación del botón |
| `call_click` | Clic en llamar |
| `lead_submit` | Envío de formulario, con `tipo`: consulta, visita, tasacion, pedido_busqueda, alerta, folleto, proximos_ingresos |
| `visit_request` | Pedido de visita, con día y franja preferidos |
| `brochure_download` | Descarga de folleto |
| `alert_signup` | Alta de alerta de búsqueda |
| `valuation_request` | Pedido de tasación |

**Contexto en todos los eventos:** `tenant_id`, `session_id`, `anonymous_id`, `lead_id` si existe, `property_id` si aplica, `page_type`, origen (`utm_*`, referrer, `src`), dispositivo y fecha y hora.

## 3. Reglas de registro

- Los eventos por ambiente se registran solo si el visor los emite. Con un visor propio, emitilos al cambiar de escena; con un proveedor que publica eventos (por ejemplo, por `postMessage`), mapealos a estos nombres; sin API de eventos, registrá solo `tour_open` y `tour_close` y avisalo en el reporte.
- Nada de datos sensibles en los eventos: tampoco el texto de los mensajes de WhatsApp.
- Los eventos anónimos se vinculan al lead cuando se registra con consentimiento.
- Enviá los eventos sin frenar la navegación (`navigator.sendBeacon` o `fetch` con `keepalive`), agrupados cuando se pueda.
- Excluí bots y las visitas del equipo de la inmobiliaria (por ejemplo, con la sesión de administración), para no inflar las métricas del cliente.

## 4. Resumen para el asesor

Cada consulta llega con un resumen legible. Ejemplo (ficticio):

> Juan Pérez, WhatsApp 549221XXXXXXX. Consultó por la casa de {barrio} (C-1043). Recorrido: 7 de 8 ambientes en 6 minutos, volvió 2 veces; donde más se quedó fue en la cocina y el patio. Abrió el plano. Llegó desde el QR del cartel. Pidió visita para el sábado a la mañana.

El resumen sale solo de eventos registrados. Si el visor no reporta ambientes, el resumen lo dice ("recorrido abierto 6 minutos, sin detalle por ambiente").

## 5. Señales de calificación

Valores iniciales para calibrar con los datos de los primeros clientes. Si el proyecto ya tiene un scoring, respetalo.

- **Caliente:** completó el recorrido y pidió visita o hizo clic en WhatsApp, o volvió 3 veces o más a la misma propiedad.
- **Tibio:** recorrió al menos la mitad de los ambientes, o vio el plano y los costos, o guardó la propiedad.
- **Frío:** solo vio la ficha o las fotos.

## 6. Ruteo

- La consulta va al asesor responsable de la propiedad. Si no tiene, al asesor por defecto del cliente.
- Después de la primera consulta, el visitante queda asociado a ese asesor ("tu asesor") y lo ve en las fichas siguientes, si el proyecto lo soporta.
- La notificación al asesor incluye el resumen de la sección 4 y un link directo a la ficha.

## 7. Consentimiento

- Todo formulario que identifica al visitante muestra el texto de [contenido-y-copy.md](contenido-y-copy.md) y el link a /privacidad, con aceptación explícita.
- Sin consentimiento, la actividad no se vincula a una persona. La medición anónima y agregada, que no identifica a nadie, sigue funcionando.

## 8. Métricas para el dueño

Si el panel de administración las muestra, cada métrica se apoya en eventos reales:

- Por propiedad: vistas, recorridos iniciados y completos, consultas, visitas pedidas y visitas realizadas (estas últimas las carga el asesor).
- Por origen: QR del cartel, Instagram, portales, búsqueda.
- **Informe para el propietario**, que sirve para captar: vistas, recorridos, ambientes más vistos y consultas de su propiedad.
- No muestres "visitas ahorradas" ni conversiones atribuidas sin una definición acordada con el cliente. Las métricas de demostración nunca se presentan como resultados.
