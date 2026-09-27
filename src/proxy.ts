import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// Solo /admin: la web pública no usa sesión y así queda cacheable.
export const config = {
  matcher: ["/admin/:path*"],
};
