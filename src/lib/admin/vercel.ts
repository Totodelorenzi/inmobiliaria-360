import "server-only";

/**
 * Dominios propios en el proyecto de Vercel por la API (opcional: sin token, la plataforma muestra
 * los pasos manuales). Docs: https://vercel.com/docs/rest-api/reference/endpoints/projects
 */
const API = "https://api.vercel.com";

/** Valores estándar de Vercel; si la API recomienda otros para el dominio, se muestran esos. */
export const DNS_POR_DEFECTO = { a: "76.76.21.21", cname: "cname.vercel-dns.com" };

function config() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const proyecto = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !proyecto) return null;
  return { token, proyecto, equipo: process.env.VERCEL_TEAM_ID?.trim() || null };
}

export const vercelConfigurado = () => config() !== null;

async function llamar(ruta: string, init: RequestInit = {}) {
  const c = config()!;
  const url = new URL(ruta, API);
  if (c.equipo) url.searchParams.set("teamId", c.equipo);
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const cuerpo = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & Record<string, unknown>;
  return { ok: res.ok, status: res.status, cuerpo };
}

/** Agrega el dominio y su www (que redirige al principal). Si ya estaba en este proyecto, sigue. */
export async function agregarDominio(dominio: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = config();
  if (!c) return { ok: false, error: "Falta configurar el token de Vercel." };
  for (const cuerpo of [{ name: dominio }, { name: `www.${dominio}`, redirect: dominio, redirectStatusCode: 308 }]) {
    const r = await llamar(`/v10/projects/${c.proyecto}/domains`, { method: "POST", body: JSON.stringify(cuerpo) });
    const yaEstaba = r.status === 409 && /already/i.test(r.cuerpo.error?.message ?? "") && !/another project|other project/i.test(r.cuerpo.error?.message ?? "");
    if (!r.ok && !yaEstaba) return { ok: false, error: r.cuerpo.error?.message ?? `Vercel respondió ${r.status}.` };
  }
  return { ok: true };
}

export async function quitarDominio(dominio: string) {
  const c = config();
  if (!c) return;
  for (const nombre of [`www.${dominio}`, dominio]) {
    await llamar(`/v9/projects/${c.proyecto}/domains/${encodeURIComponent(nombre)}`, { method: "DELETE" });
  }
}

/** Registros DNS que recomienda Vercel para el dominio (o los estándar si la API no responde). */
export async function registrosRecomendados(dominio: string): Promise<{ a: string; cname: string }> {
  if (!config()) return DNS_POR_DEFECTO;
  const r = await llamar(`/v6/domains/${encodeURIComponent(dominio)}/config`);
  const ipv4 = r.cuerpo.recommendedIPv4 as { rank?: number; value?: string[] }[] | undefined;
  const cname = r.cuerpo.recommendedCNAME as { rank?: number; value?: string }[] | undefined;
  const primero = <T extends { rank?: number }>(lista?: T[]) => lista?.slice().sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99))[0];
  return {
    a: primero(ipv4)?.value?.[0] ?? DNS_POR_DEFECTO.a,
    cname: primero(cname)?.value?.replace(/\.$/, "") ?? DNS_POR_DEFECTO.cname,
  };
}
