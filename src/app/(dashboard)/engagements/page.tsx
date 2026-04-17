import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENGAGEMENT_STATUS_CONFIG } from "@/lib/constants";
import type { Engagement } from "@/lib/types";

export default async function EngagementsPage() {
  const supabase = await createClient();
  const { data: engagements } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engagements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage active and completed diligence engagements
          </p>
        </div>
        <Link
          href="/engagements/new"
          className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          New Engagement
        </Link>
      </div>

      <div className="grid gap-4">
        {engagements?.map((engagement: Engagement) => {
          const statusConfig =
            ENGAGEMENT_STATUS_CONFIG[engagement.status];
          return (
            <Link
              key={engagement.id}
              href={`/engagements/${engagement.id}`}
              className="block rounded-lg border bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {engagement.target_company_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {engagement.client_firm_name} &middot;{" "}
                    {engagement.deal_stage.replace("_", " ")}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>
            </Link>
          );
        })}
        {(!engagements || engagements.length === 0) && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-sm text-gray-500">
              No engagements yet. Create your first one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
