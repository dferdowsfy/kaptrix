import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  isPreviewTabHidden,
  resolvePreviewTabFromPath,
} from "@/lib/preview-access";

// Routes that are publicly accessible without authentication.
// The /preview workspace is the demo experience; /api/preview and /api/chat
// back that workspace and must also be reachable anonymously.
const PUBLIC_PATH_PREFIXES = [
  "/preview",
  "/app",
  "/login",
  "/account",
  "/how-it-works",
  "/api/auth",
  "/api/preview",
  "/api/chat",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session cookie if present, but never redirect to login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-enforced page hiding for SIGNED-IN users.
  //
  // `/app/*` is a rewrite to `/preview/*` (see next.config.ts). Without
  // guarding BOTH prefixes, a signed-in user could bypass the hide by
  // typing the underlying `/preview/...` URL directly. `/preview/*` also
  // remains the anonymous demo surface, so we only enforce when a user
  // session is present — anonymous visitors see the full demo.
  const path = request.nextUrl.pathname;
  const isProtectedSurface =
    path.startsWith("/app") || path.startsWith("/preview");
  if (user && isProtectedSurface) {
    const { data: profile } = await supabase
      .from("users")
      .select("hidden_menu_keys")
      .eq("id", user.id)
      .maybeSingle();

    const hiddenKeys =
      (profile?.hidden_menu_keys as string[] | null | undefined) ?? [];
    const tabId = resolvePreviewTabFromPath(path);

    if (isPreviewTabHidden(tabId, hiddenKeys)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = path.startsWith("/preview") ? "/preview" : "/app";
      redirectUrl.search = "";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
