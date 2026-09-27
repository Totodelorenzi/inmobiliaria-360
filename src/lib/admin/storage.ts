import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const BUCKETS = ["fotos", "panoramas", "planos"] as const;
export type Bucket = (typeof BUCKETS)[number];

/** Bucket y ruta a partir de la URL pública de Storage (null si no es de este proyecto). */
export function rutaDeUrl(url: string | null | undefined): { bucket: Bucket; ruta: string } | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(\?.*)?$/);
  if (!m || !BUCKETS.includes(m[1] as Bucket)) return null;
  return { bucket: m[1] as Bucket, ruta: decodeURIComponent(m[2]) };
}

/** Borra los archivos de esas URLs (ignora las que no son de Storage). */
export async function borrarArchivos(supabase: SupabaseClient<Database>, urls: (string | null | undefined)[]) {
  const porBucket = new Map<Bucket, string[]>();
  for (const url of urls) {
    const r = rutaDeUrl(url);
    if (r) porBucket.set(r.bucket, [...(porBucket.get(r.bucket) ?? []), r.ruta]);
  }
  await Promise.all([...porBucket].map(([bucket, rutas]) => supabase.storage.from(bucket).remove(rutas)));
}

/** Borra la carpeta {agencia}/{propiedad} de los tres buckets. */
export async function borrarCarpetaPropiedad(supabase: SupabaseClient<Database>, agencyId: string, propertyId: string) {
  const carpeta = `${agencyId}/${propertyId}`;
  await Promise.all(
    BUCKETS.map(async (bucket) => {
      const { data } = await supabase.storage.from(bucket).list(carpeta, { limit: 1000 });
      if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${carpeta}/${f.name}`));
    }),
  );
}

/** Copia un archivo a la carpeta de otra propiedad y devuelve la URL pública nueva. */
export async function copiarArchivo(supabase: SupabaseClient<Database>, url: string | null, destinoPropiedad: string) {
  const r = rutaDeUrl(url);
  if (!url || !r) return url;
  const [agencia, , ...resto] = r.ruta.split("/");
  const nuevaRuta = `${agencia}/${destinoPropiedad}/${resto.join("/")}`;
  const { error } = await supabase.storage.from(r.bucket).copy(r.ruta, nuevaRuta);
  if (error) throw new Error(`No se pudo copiar ${resto.join("/")}: ${error.message}`);
  return supabase.storage.from(r.bucket).getPublicUrl(nuevaRuta).data.publicUrl;
}
