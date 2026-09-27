import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const TIPOS: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

/** Destino de los links de los mails (invitación y recuperación): valida el token y abre sesión. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";
  const destino = next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";

  if (!isSupabaseConfigured()) redirect("/admin/login");
  const supabase = await createClient();
  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) redirect(destino);
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) redirect(destino);
  }
  redirect("/admin/login?error=link");
}
