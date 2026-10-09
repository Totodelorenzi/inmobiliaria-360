/**
 * Crea (o actualiza) el usuario administrador inicial con ADMIN_EMAIL de .env.local: superadmin de la
 * plataforma (crea inmobiliarias) y admin de la inmobiliaria de ejemplo.
 * Si ADMIN_PASSWORD está vacía, genera una contraseña segura y la guarda en .env.local.
 *   npm run crear-admin
 */
import { randomInt } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGENCIA_DEMO_ID } from "./seed/datos.ts";

const ENV_LOCAL = new URL("../.env.local", import.meta.url);

/** 20 caracteres sin ambiguos (0/O, 1/l), siempre con letras y números. */
function generarClave() {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const todos = letras + numeros;
  const chars = [letras[randomInt(letras.length)], numeros[randomInt(numeros.length)]];
  while (chars.length < 20) chars.push(todos[randomInt(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function guardarEnEnvLocal(nombre: string, valor: string) {
  const actual = await readFile(ENV_LOCAL, "utf8");
  const linea = `${nombre}=${valor}`;
  const regex = new RegExp(`^${nombre}=.*$`, "m");
  await writeFile(ENV_LOCAL, regex.test(actual) ? actual.replace(regex, linea) : `${actual.trimEnd()}\n${linea}\n`);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || email.includes("PLACEHOLDER".toLowerCase()) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error("Completá ADMIN_EMAIL en .env.local con el mail del administrador.");
  }
  let clave = process.env.ADMIN_PASSWORD?.trim();
  if (!clave) {
    clave = generarClave();
    await guardarEnEnvLocal("ADMIN_PASSWORD", clave);
    console.log("• Contraseña nueva generada y guardada en .env.local (ADMIN_PASSWORD)");
  }

  const db = createAdminClient();
  // La de ejemplo; si no existe, la primera creada.
  const { data: demo } = await db.from("agencies").select("id").eq("id", AGENCIA_DEMO_ID).maybeSingle();
  const agencyId = demo?.id ?? (await db.from("agencies").select("id").order("created_at").limit(1).maybeSingle()).data?.id;
  if (!agencyId) throw new Error("No hay ninguna inmobiliaria en la base. Corré primero: npm run seed");

  // Buscar si el usuario ya existe (la API no filtra por email: se recorren las páginas).
  let userId: string | undefined;
  for (let page = 1; !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`No se pudo leer los usuarios: ${error.message}`);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }

  if (userId) {
    const { error } = await db.auth.admin.updateUserById(userId, { password: clave, email_confirm: true });
    if (error) throw new Error(`No se pudo actualizar el usuario: ${error.message}`);
    console.log(`• El usuario ${email} ya existía: se actualizó su contraseña con la de .env.local`);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (error || !data.user) throw new Error(`No se pudo crear el usuario: ${error?.message}`);
    userId = data.user.id;
    console.log(`• Usuario creado: ${email}`);
  }

  const { error } = await db.from("agency_members").upsert({ user_id: userId, agency_id: agencyId, rol: "admin" }, { onConflict: "user_id,agency_id" });
  if (error) throw new Error(`No se pudo asignar la inmobiliaria: ${error.message}`);
  const { error: errorPlataforma } = await db.from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
  if (errorPlataforma) throw new Error(`No se pudo marcar como superadmin: ${errorPlataforma.message}`);
  console.log(`\nListo: ${email} es administrador y superadmin de la plataforma. La contraseña está en .env.local (ADMIN_PASSWORD).`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
