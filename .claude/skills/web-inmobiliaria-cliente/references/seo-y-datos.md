# SEO, vista previa y datos estructurados

## Contenido

1. Metadatos por página
2. Indexación y sitemap
3. Vista previa al compartir
4. Datos estructurados (JSON-LD)
5. Rendimiento

## 1. Metadatos por página

- **Ficha:** title del estilo "{Tipo} en {venta o alquiler} en {barrio}, {ciudad} | {inmobiliaria}", de unos 60 caracteres. Description de 140 a 160 caracteres con precio y dos o tres atributos.
- **Listado:** title y description por operación, tipo y barrio cuando la URL los fija.
- **Home:** nombre de la inmobiliaria, ciudad y propuesta concreta.
- Cada página con su URL canónica.

## 2. Indexación y sitemap

- Las combinaciones de filtros sin valor propio llevan canonical a la versión limpia o `noindex`.
- Las fichas vendidas o alquiladas siguen accesibles con su estado y similares, pero salen del sitemap.
- Sitemap con fichas activas, emprendimientos, asesores y barrios; `robots.txt` apuntando al sitemap.

## 3. Vista previa al compartir

WhatsApp e Instagram son el canal principal, así que la vista previa es parte del diseño.

- `og:title`, `og:description`, `og:url` canónica y `og:image` por ficha: foto principal con precio, barrio y logo, de 1200 × 630, generada dinámicamente si el stack lo permite.
- Probala compartiendo un link real por WhatsApp. WhatsApp guarda en caché las vistas previas: para ver un cambio, probá con una URL nueva (por ejemplo, con un parámetro).

## 4. Datos estructurados (JSON-LD)

Además de los buscadores, los asistentes de IA leen mejor los avisos con datos estructurados y consistentes. El mismo dato de la base alimenta la ficha, los metadatos y el JSON-LD.

- **Inmobiliaria:** `RealEstateAgent` con name, logo, url, telephone, address, geo, openingHoursSpecification, areaServed y sameAs (Instagram, Facebook).
- **Ficha:** `RealEstateListing` con url, name, datePosted, image y offers (`Offer` con price, priceCurrency, availability y businessFunction de venta o alquiler), más `about` con el inmueble (`SingleFamilyResidence`, `House`, `Apartment` o `Accommodation`) y sus atributos.
- **Migas de pan:** `BreadcrumbList`.
- `geo` y la dirección exacta van solo si la ubicación de esa propiedad es pública.
- Validá con validator.schema.org y con la prueba de resultados enriquecidos de Google antes de publicar.

Ejemplo de ficha (valores ficticios):

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "url": "https://inmobiliaria-ejemplo.com.ar/propiedades/casa-quincho-patio-c1043",
  "name": "Casa con quincho y patio de 300 m² cerca del parque",
  "datePosted": "2026-10-20",
  "image": ["https://inmobiliaria-ejemplo.com.ar/fotos/c1043-fachada.webp"],
  "offers": {
    "@type": "Offer",
    "price": 145000,
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "businessFunction": "http://purl.org/goodrelations/v1#Sell"
  },
  "about": {
    "@type": "SingleFamilyResidence",
    "floorSize": { "@type": "QuantitativeValue", "value": 160, "unitCode": "MTK" },
    "numberOfRooms": 4,
    "numberOfBedrooms": 3,
    "numberOfBathroomsTotal": 2,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ciudad",
      "addressRegion": "Buenos Aires",
      "addressCountry": "AR"
    }
  }
}
```

En alquiler, `businessFunction` es `http://purl.org/goodrelations/v1#LeaseOut`. Una propiedad vendida o alquilada pasa a `https://schema.org/SoldOut`.

## 5. Rendimiento

- La imagen principal de la ficha y del hero carga con prioridad y en el tamaño justo; el resto, diferido.
- Formatos modernos (WebP o AVIF) con `srcset`.
- Fuentes con subset latino y `font-display: swap`.
- El visor del recorrido carga recién al abrirlo.
- Revisá con Lighthouse sobre el preview de Vercel, en modo mobile con red lenta.
