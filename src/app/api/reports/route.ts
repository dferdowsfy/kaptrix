import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data, error } = await ctx.supabase
      .from("reports")
      .select("*")
      .order("generated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
