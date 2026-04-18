import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ChangePasswordBody>;
  const currentPassword = body.currentPassword?.trim() ?? "";
  const newPassword = body.newPassword?.trim() ?? "";
  const confirmPassword = body.confirmPassword?.trim() ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "All password fields are required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match" },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from current password" },
      { status: 400 },
    );
  }

  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyErr) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  await logAuditEvent({
    action: "user.password.change",
    entity: "user",
    entity_id: user.id,
    metadata: { source: "settings" },
  });

  return NextResponse.json({ ok: true });
}