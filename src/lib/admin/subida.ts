import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import type { Bucket } from "./storage";

type Opciones = { bucket: Bucket; ruta: string; archivo: Blob; alAvanzar?: (fraccion: number) => void };

function mensaje(status: number, cuerpo: string) {
  if (status === 413 || /exceeded the maximum/i.test(cuerpo)) return "El archivo es demasiado grande.";
  if (status === 415 || /mime type/i.test(cuerpo)) return "Ese tipo de archivo no está permitido.";
  if (status === 401 || status === 403) return "Tu sesión venció o no tenés permiso. Volvé a entrar al panel.";
  return "No se pudo subir el archivo. Revisá tu conexión y reintentá.";
}

/**
 * Sube un archivo a Storage mostrando el progreso (supabase-js no lo informa).
 * Devuelve la URL pública. Los nombres son únicos, así que se cachean por un año.
 */
export async function subirArchivo({ bucket, ruta, archivo, alAvanzar }: Opciones): Promise<string> {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) throw new Error("Tu sesión venció. Volvé a entrar al panel.");

  const destino = `${bucket}/${ruta.split("/").map(encodeURIComponent).join("/")}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${supabaseUrl}/storage/v1/object/${destino}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", supabasePublishableKey);
    xhr.setRequestHeader("Content-Type", archivo.type || "application/octet-stream");
    xhr.setRequestHeader("Cache-Control", "max-age=31536000");
    xhr.upload.onprogress = (e) => e.lengthComputable && alAvanzar?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status < 300
        ? resolve(`${supabaseUrl}/storage/v1/object/public/${destino}`)
        : reject(new Error(mensaje(xhr.status, xhr.responseText)));
    xhr.onerror = () => reject(new Error("Se cortó la conexión mientras se subía el archivo. Reintentá."));
    xhr.send(archivo);
  });
}

/** Ruta única dentro de la carpeta de la propiedad. */
export function rutaNueva(agencyId: string, propertyId: string, extension: string, sufijo = "") {
  return `${agencyId}/${propertyId}/${crypto.randomUUID()}${sufijo}.${extension}`;
}
