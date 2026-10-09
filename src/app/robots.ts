import type { MetadataRoute } from "next";

// Panel central y página neutra de la plataforma: no se indexan. Cada inmobiliaria tiene su robots.txt.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
