import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/admin-panel";
import { isAdminEmail } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || isAdminEmail(user.email);
  if (!isAdmin) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminPanel />
    </div>
  );
}
