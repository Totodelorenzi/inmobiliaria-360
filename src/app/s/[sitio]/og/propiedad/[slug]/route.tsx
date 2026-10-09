import { ImageResponse } from "next/og";
import { normalizeHex } from "@/lib/color";
import { getAgencia, getPropiedad } from "@/lib/data/sitio";
import { formatPrecio, formatUbicacion, OPERACION_LABEL } from "@/lib/format";

import { OG_SIZE as size } from "@/lib/og";

// Caché de Next (ISR) bajo la ruta interna /s/<sitio>/...: separada por inmobiliaria aunque dos
// tengan el mismo slug. Se genera al primer pedido y se renueva cada hora.
export const dynamic = "force-static";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

/** Descarga la foto como data URL (solo JPEG o PNG, que es lo que soporta el generador). */
async function fotoComoDataUrl(url: string | undefined) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const tipo = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(jpeg|png)/.test(tipo)) return null;
    return `data:${tipo};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Imagen para compartir la propiedad (WhatsApp, redes): foto, precio, título y etiquetas. */
export async function GET(_request: Request, { params }: RouteContext<"/s/[sitio]/og/propiedad/[slug]">) {
  const { sitio, slug } = await params;
  const agencia = await getAgencia(sitio);
  const p = agencia ? await getPropiedad(agencia.id, slug) : null;
  const brand = normalizeHex(agencia?.color_primario) ?? "#1f3a5f";

  if (!agencia || !p) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: brand, color: "white", fontSize: 64, fontWeight: 700 }}>
          {agencia?.nombre ?? "Propiedades"}
        </div>
      ),
      size,
    );
  }

  const foto = await fotoComoDataUrl(p.fotos[0]?.thumb_url ?? p.fotos[0]?.url);
  const etiquetas = [OPERACION_LABEL[p.operacion], p.cantidadEscenas > 0 && "Tour 360°", p.cantidadPlanos > 0 && "Planos"].filter(
    Boolean,
  ) as string[];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: brand }}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo admite <img>
          <img src={foto} alt="" width={1200} height={630} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: 56,
            color: "white",
            backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {etiquetas.map((etiqueta, i) => (
              <div
                key={etiqueta}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: 999,
                  fontSize: 28,
                  fontWeight: 700,
                  background: i === 0 ? "rgba(0,0,0,0.6)" : "#FFC83D",
                  color: i === 0 ? "white" : "#1a1400",
                }}
              >
                {etiqueta}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800 }}>{formatPrecio(p.precio, p.moneda, p.operacion)}</div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 600, marginTop: 8 }}>{p.titulo.slice(0, 70)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, marginTop: 16, opacity: 0.9 }}>
            <span>{formatUbicacion(p)}</span>
            <span>{agencia.nombre}</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
