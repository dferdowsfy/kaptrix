import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/\\")) return false;
  if (path.includes("@")) return false;
  try {
    const url = new URL(path, "http://localhost");
    if (url.hostname !== "localhost") return false;
  } catch {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/engagements";
  const next = isSafeRedirectPath(rawNext) ? rawNext : "/engagements";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
