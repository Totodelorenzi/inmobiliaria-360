/**
 * Usuario para mostrar el panel en presentaciones: agente de la inmobiliaria demo (ve inicio, propiedades,
 * leads con su puntaje e historial y estadísticas; no ve configuración ni usuarios, no es superadmin).
 * Si DEMO_PASSWORD está vacía, genera una y la guarda en .env.local. Se puede correr las veces que haga falta.
 *   npm run crear-usuario-demo
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { generarClave, guardarEnEnvLocal } from "./seed/clave.ts";
import { AGENCIA_DEMO_ID } from "./seed/datos.ts";

async function main() {
  // Dominio .example: reservado, nunca recibe mails (la cuenta se crea ya confirmada).
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase() || "demo@inmobiliaria360.example";
  if (!process.env.DEMO_EMAIL?.trim()) await guardarEnEnvLocal("DEMO_EMAIL", email);
  let clave = process.env.DEMO_PASSWORD?.trim();
  if (!clave) {
    clave = generarClave();
    await guardarEnEnvLocal("DEMO_PASSWORD", clave);
    console.log("• Contraseña nueva generada y guardada en .env.local (DEMO_PASSWORD)");
  }

  const db = createAdminClient();
  const { data: demo } = await db.from("agencies").select("id, nombre").eq("id", AGENCIA_DEMO_ID).maybeSingle();
  if (!demo) throw new Error("No existe la inmobiliaria demo. Corré primero: npm run seed");

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
    console.log(`• El usuario ${email} ya existía: contraseña sincronizada con .env.local`);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (error || !data.user) throw new Error(`No se pudo crear el usuario: ${error?.message}`);
    userId = data.user.id;
    console.log(`• Usuario creado: ${email}`);
  }

  // Solo agente de la demo: si alguna vez se le dio otra inmobiliaria o superadmin, se le quita.
  await db.from("platform_admins").delete().eq("user_id", userId);
  await db.from("agency_members").delete().eq("user_id", userId).neq("agency_id", AGENCIA_DEMO_ID);
  const { error } = await db.from("agency_members").upsert({ user_id: userId, agency_id: AGENCIA_DEMO_ID, rol: "agente" }, { onConflict: "user_id,agency_id" });
  if (error) throw new Error(`No se pudo asignar la inmobiliaria demo: ${error.message}`);
  console.log(`\nListo: ${email} entra al panel como agente de ${demo.nombre}. La contraseña está en .env.local (DEMO_PASSWORD).`);
}

main().catch((error: unknown) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
