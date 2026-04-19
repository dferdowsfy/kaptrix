import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface StoreBody {
  client_id: string;
  report_type: string;
  title: string;
  target: string;
  client_name?: string;
  content: string;
  generated_at?: string;
}

interface UserReportRow {
  client_id: string;
  report_type: string;
  title: string;
  target: string;
  client_name: string | null;
  content: string;
  generated_at: string;
  updated_at: string;
}

// GET: list all reports for the authenticated user.
// Optional ?client_id= filter.
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ reports: [], authenticated: false });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");

  let query = supabase
    .from("user_reports")
    .select(
      "client_id, report_type, title, target, client_name, content, generated_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: error.message, authenticated: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    reports: (data ?? []) as UserReportRow[],
  });
}

// POST: upsert a single report. Overwrites by (user_id, client_id, report_type).
export async function POST(req: Request) {
  let body: StoreBody;
  try {
    body = (await req.json()) as StoreBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.client_id || !body.report_type || !body.content) {
    return NextResponse.json(
      { error: "Missing client_id, report_type, or content" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated", authenticated: false },
      { status: 401 },
    );
  }

  const { error } = await supabase.from("user_reports").upsert(
    {
      user_id: user.id,
      client_id: body.client_id,
      report_type: body.report_type,
      title: body.title,
      target: body.target,
      client_name: body.client_name ?? null,
      content: body.content,
      generated_at: body.generated_at ?? new Date().toISOString(),
    },
    { onConflict: "user_id,client_id,report_type" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE: remove a single report.
// Body: { client_id, report_type }
export async function DELETE(req: Request) {
  let body: { client_id?: string; report_type?: string };
  try {
    body = (await req.json()) as { client_id?: string; report_type?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.client_id || !body.report_type) {
    return NextResponse.json(
      { error: "Missing client_id or report_type" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("user_reports")
    .delete()
    .eq("user_id", user.id)
    .eq("client_id", body.client_id)
    .eq("report_type", body.report_type);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
