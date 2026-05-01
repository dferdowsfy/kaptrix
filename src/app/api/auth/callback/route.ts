import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeRedirectUrl(origin: string, next: string): string {
  const fallback = `${origin}/engagements`;

  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }

  try {
    const resolved = new URL(next, origin);
    if (resolved.origin !== origin) {
      return fallback;
    }
    return resolved.href;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/engagements";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeRedirectUrl(origin, next));
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
