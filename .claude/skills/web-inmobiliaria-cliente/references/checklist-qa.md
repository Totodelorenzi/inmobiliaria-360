# Checklist antes de publicar

Usalo completo antes de cada lanzamiento y como guía en las auditorías. En una auditoría, cada ítem que falla se reporta con prioridad: crítico si rompe una regla que se cumple siempre, importante o mejora.

## Marca y diseño

- [ ] La plataforma no aparece en ningún lado salvo el "Hecho con {plataforma}" del footer.
- [ ] Paleta, tipografías y layout coinciden con el plan aprobado.
- [ ] El registro de diseño está actualizado y no repite la combinación de otro cliente de la misma ciudad.
- [ ] Ningún default genérico de la lista de [sistema-de-diseno.md](sistema-de-diseno.md) entró sin una razón de marca.
- [ ] Contraste verificado con `scripts/contraste.mjs`, incluidos botones y badges sobre fotos.

## Contenido y datos

- [ ] Cero placeholders: buscá "lorem", "TODO", "PENDIENTE", "ejemplo" y datos ficticios de las plantillas.
- [ ] Ningún dato inventado: precios, superficies, reseñas, años, operaciones, distancias.
- [ ] Cada ficha tiene precio o "Consultar precio", estado, superficies discriminadas, fotos rotuladas y ordenadas, plano correcto y asesor correcto.
- [ ] Reservadas, vendidas y alquiladas muestran el badge y los CTA correctos; los links viejos muestran similares.
- [ ] Renders, amoblado virtual e imágenes con IA están rotulados.
- [ ] Los textos siguen [contenido-y-copy.md](contenido-y-copy.md): voz del cliente, CTAs consistentes, títulos concretos.

## Ficha y recorrido

- [ ] Con el 360 activo: abre, se navega por ambientes, vuelve a la misma posición de la ficha y el CTA primario cambia al completarlo.
- [ ] Con el 360 apagado: no hay pestaña ni espacio vacío.
- [ ] Estados de carga y error del recorrido probados (con red lenta y con el visor fallando).
- [ ] La ficha funciona como página de aterrizaje: se entiende de quién es y cuál es el siguiente paso sin pasar por la home.

## Conversión y medición

- [ ] WhatsApp: número en formato wa.me correcto, mensaje con código y link, abre bien en un celular.
- [ ] Cada formulario envía, muestra su confirmación y el lead llega al asesor correcto con la propiedad y el resumen.
- [ ] Consentimiento y link a /privacidad en todos los formularios que identifican al visitante.
- [ ] Recorrido completo de prueba verificado en la base: `listing_view`, `tour_open`, eventos por ambiente (si el visor los emite), `tour_complete`, `whatsapp_click`, `lead_submit`.
- [ ] Las visitas de prueba del equipo están excluidas o marcadas.
- [ ] El QR del cartel abre la ficha correcta y registra `qr_landing`.

## Mobile y accesibilidad

- [ ] A 360 px de ancho: menú usable, barra fija que no tapa contenido, galería con deslizamiento, recorrido usable y formularios con el teclado correcto.
- [ ] Todo se alcanza con teclado y el foco es visible.
- [ ] Textos alternativos con el ambiente y lo que se ve.
- [ ] `prefers-reduced-motion` respetado.

## SEO y vista previa

- [ ] Titles y descriptions únicos, canonical, sitemap y robots.
- [ ] JSON-LD válido en validator.schema.org.
- [ ] Vista previa probada compartiendo una ficha por WhatsApp.

## Técnico y entrega

- [ ] Build sin errores y preview de Vercel revisado en un celular real.
- [ ] Imágenes optimizadas y Lighthouse mobile razonable sobre el preview.
- [ ] Dominio, HTTPS y variables de entorno del cliente configurados.
- [ ] 404, sin resultados y errores con la marca.
- [ ] /privacidad publicada, matrícula visible y datos de contacto correctos.
- [ ] `docs/clientes/{slug}/entrega.md` generado y registro de diseño actualizado.
