import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_PREFIXES = ["/configuration", "/app", "/admin", "/double-authentification"];
const GUEST_ONLY = ["/connexion", "/inscription"];

/**
 * Rafraîchit la session Supabase à chaque requête et fait les redirections « optimistes » :
 * visiteur → connexion pour les pages privées, membre connecté → configuration pour les pages
 * d'accès. L'autorisation réelle reste vérifiée côté serveur (getUser) et par la RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Comme lib/supabase/server.ts : session illisible par le JavaScript de la page.
      cookieOptions: { httpOnly: true },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    const [targetPath, targetSearch = ""] = path.split("?");
    url.pathname = targetPath;
    url.search = targetSearch ? `?${targetSearch}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return redirectTo(`/connexion?next=${encodeURIComponent(pathname + search)}`);
  }
  if (user && GUEST_ONLY.includes(pathname)) {
    const site = request.nextUrl.searchParams.get("site");
    return redirectTo(site ? `/configuration?site=${encodeURIComponent(site)}` : "/configuration");
  }
  return response;
}

// Uniquement les pages qui dépendent de la session : le site vitrine reste statique et rapide.
export const config = {
  matcher: [
    "/configuration/:path*",
    "/app/:path*",
    "/admin/:path*",
    "/double-authentification",
    "/connexion",
    "/inscription",
    "/nouveau-mot-de-passe",
  ],
};
