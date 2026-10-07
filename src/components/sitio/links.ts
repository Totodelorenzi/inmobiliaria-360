// Fuera de menu-movil.tsx ("use client"): un componente de servidor que importa un valor
// de un módulo de cliente recibe una referencia, no el array.
export const LINKS_SITIO = [
  { href: "/alquiler", label: "Alquiler" },
  { href: "/venta", label: "Venta" },
  { href: "/emprendimientos", label: "Emprendimientos" },
] as const;
