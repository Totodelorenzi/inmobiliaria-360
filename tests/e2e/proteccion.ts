/**
 * Regla de los tests contra la base real: TODO lo que escriben va a una inmobiliaria de prueba
 * propia de la corrida (es_test = true, subdominio e2e-…), nunca a la demo ni a una inmobiliaria real.
 * Cada borrado o escritura pasa por estas funciones, que abortan si el destino no es de prueba.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENCIA_DEMO_ID } from "../../scripts/seed/datos.ts";
import type { Database, TablesInsert } from "../../src/types/database";

type Db = SupabaseClient<Database>;
type AgenciaMinima = { id: string; es_test: boolean; subdominio: string };

export class ProteccionError extends Error {
  constructor(motivo: string) {
    super(`Protección de tests: ${motivo}. No se tocó nada.`);
    this.name = "ProteccionError";
  }
}

export const PREFIJO_PRUEBA = "e2e-";
const EMAIL_DE_PRUEBA = /^e2e-[a-z0-9-]+@example\.com$/;

/** Aborta si la inmobiliaria no es de prueba (o es la demo). */
export function verificarAgenciaDePrueba(agencia: AgenciaMinima | null | undefined, id: string): asserts agencia is AgenciaMinima {
  if (!agencia) throw new ProteccionError(`la inmobiliaria ${id} no existe`);
  if (agencia.id === AGENCIA_DEMO_ID) throw new ProteccionError("es la inmobiliaria demo");
  if (!agencia.es_test) throw new ProteccionError(`"${agencia.subdominio}" no está marcada como de prueba (es_test)`);
  if (!agencia.subdominio.startsWith(PREFIJO_PRUEBA)) throw new ProteccionError(`"${agencia.subdominio}" no empieza con ${PREFIJO_PRUEBA}`);
}

/** Aborta si el usuario no es uno creado por los tests. */
export function verificarUsuarioDePrueba(email: string | undefined) {
  if (!email || !EMAIL_DE_PRUEBA.test(email)) throw new ProteccionError(`el usuario ${email ?? "(sin email)"} no es de prueba`);
}

export async function exigirAgenciaDePrueba(db: Db, id: string) {
  const { data, error } = await db.from("agencies").select("id, es_test, subdominio").eq("id", id).maybeSingle();
  if (error) throw new ProteccionError(`no se pudo verificar la inmobiliaria (${error.message})`);
  verificarAgenciaDePrueba(data, id);
  return data;
}

/** Crea una inmobiliaria de prueba con la marca de la demo. */
export async function crearAgenciaDePrueba(db: Db, subdominio: string, nombre: string) {
  if (!subdominio.startsWith(PREFIJO_PRUEBA)) throw new ProteccionError(`"${subdominio}" no empieza con ${PREFIJO_PRUEBA}`);
  const { data: demo } = await db.from("agencies").select("color_primario, whatsapp, email, telefono, direccion, logo_url").eq("id", AGENCIA_DEMO_ID).maybeSingle();
  const { data, error } = await db
    .from("agencies")
    .insert({ ...(demo ?? {}), nombre, subdominio, es_test: true })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear la inmobiliaria de prueba: ${error.message}`);
  return data.id;
}

/**
 * Copia las propiedades publicadas de la demo a la inmobiliaria de prueba (solo filas: las URL siguen
 * apuntando a los archivos de la demo, que nunca se borran por URL desde los tests).
 */
export async function copiarDemo(db: Db, destino: string) {
  await exigirAgenciaDePrueba(db, destino);
  const { data: propiedades, error } = await db
    .from("properties")
    .select("*, fotos:property_photos(*), escenas:tour_scenes(*, hotspots:tour_hotspots!tour_hotspots_scene_id_fkey(*)), planos:property_plans(*, puntos:plan_hotspots(*))")
    .eq("agency_id", AGENCIA_DEMO_ID)
    .eq("publicada", true);
  if (error) throw new Error(`No se pudo leer la demo: ${error.message}`);

  for (const { id: _id, fotos, escenas, planos, created_at: _c, updated_at: _u, busqueda: _b, ...datos } of propiedades) {
    const propertyId = crypto.randomUUID();
    const alta = await db.from("properties").insert({ ...datos, id: propertyId, agency_id: destino, es_demo: false });
    if (alta.error) throw new Error(`No se pudo copiar ${datos.slug}: ${alta.error.message}`);
    if (fotos.length) {
      await db.from("property_photos").insert(fotos.map(({ id: _f, property_id: _p, ...f }) => ({ ...f, property_id: propertyId })));
    }
    const escena = new Map(escenas.map((e) => [e.id, crypto.randomUUID()]));
    if (escenas.length) {
      await db.from("tour_scenes").insert(
        escenas.map(({ id, hotspots: _h, property_id: _p, created_at: _c2, ...e }): TablesInsert<"tour_scenes"> => ({ ...e, id: escena.get(id), property_id: propertyId })),
      );
      const hotspots = escenas.flatMap((e) =>
        e.hotspots.map(({ id: _h, scene_id, target_scene_id, ...h }) => ({ ...h, scene_id: escena.get(scene_id)!, target_scene_id: escena.get(target_scene_id)! })),
      );
      if (hotspots.length) await db.from("tour_hotspots").insert(hotspots);
    }
    for (const { id: _pl, puntos, property_id: _p, ...plano } of planos) {
      const planId = crypto.randomUUID();
      await db.from("property_plans").insert({ ...plano, id: planId, property_id: propertyId });
      if (puntos.length) {
        await db.from("plan_hotspots").insert(
          puntos.map(({ id: _pt, plan_id: _pi, scene_id, ...pt }) => ({ ...pt, plan_id: planId, scene_id: scene_id ? (escena.get(scene_id) ?? null) : null })),
        );
      }
    }
  }
  return propiedades.length;
}

/** Borra los archivos que los tests subieron a la carpeta de la inmobiliaria de prueba. */
async function borrarArchivosDeAgencia(db: Db, agencyId: string) {
  for (const bucket of ["fotos", "panoramas", "planos"]) {
    const { data: carpetas } = await db.storage.from(bucket).list(agencyId, { limit: 1000 });
    for (const carpeta of carpetas ?? []) {
      const ruta = `${agencyId}/${carpeta.name}`;
      const { data: archivos } = await db.storage.from(bucket).list(ruta, { limit: 1000 });
      if (archivos?.length) await db.storage.from(bucket).remove(archivos.map((a) => `${ruta}/${a.name}`));
    }
  }
}

/** Borra la inmobiliaria de prueba entera (propiedades, leads, visitas en cascada) y sus archivos. */
export async function borrarAgenciaDePrueba(db: Db, id: string) {
  await exigirAgenciaDePrueba(db, id);
  await borrarArchivosDeAgencia(db, id);
  const { error } = await db.from("agencies").delete().eq("id", id).eq("es_test", true);
  if (error) throw new Error(`No se pudo borrar la inmobiliaria de prueba: ${error.message}`);
}

/** Borra un usuario creado por los tests (aborta con cualquier otro). */
export async function borrarUsuarioDePrueba(db: Db, userId: string) {
  const { data } = await db.auth.admin.getUserById(userId);
  if (!data.user) return;
  verificarUsuarioDePrueba(data.user.email);
  await db.auth.admin.deleteUser(userId);
}
