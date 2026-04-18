import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";

export async function GET() {
  try {
    const ctx = await requireAuth();
    const { data, error } = await ctx.supabase
      .from("benchmark_cases")
      .select("*")
      .order("case_anchor_id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
