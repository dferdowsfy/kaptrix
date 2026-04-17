import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ENGAGEMENT_STATUS_CONFIG, ENGAGEMENT_TIERS } from "@/lib/constants";
import type { Engagement, EngagementTier } from "@/lib/types";
import { formatDate, formatCurrency, daysUntilDeadline } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EngagementDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", id)
    .single();

  if (!engagement) {
    notFound();
  }

  const eng = engagement as Engagement;
  const statusConfig = ENGAGEMENT_STATUS_CONFIG[eng.status];
  const tierConfig = ENGAGEMENT_TIERS[eng.tier as EngagementTier];

  const tabs = [
    { name: "Documents", href: `/engagements/${id}/documents` },
    { name: "Pre-Analysis", href: `/engagements/${id}/pre-analysis` },
    { name: "Scoring", href: `/engagements/${id}/scoring` },
    { name: "Report", href: `/engagements/${id}/report` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {eng.target_company_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {eng.client_firm_name} &middot; {tierConfig.name} &middot;{" "}
            {eng.deal_stage.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {eng.delivery_deadline && (
            <span className="text-sm text-gray-500">
              {daysUntilDeadline(eng.delivery_deadline)} days to deadline
            </span>
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-500">Fee</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {eng.engagement_fee
                ? formatCurrency(eng.engagement_fee)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Deadline</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {eng.delivery_deadline
                ? formatDate(eng.delivery_deadline)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">NDA Signed</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {eng.nda_signed_at ? formatDate(eng.nda_signed_at) : "Pending"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {formatDate(eng.created_at)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className="flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-gray-600 transition hover:bg-white hover:text-gray-900 hover:shadow-sm"
          >
            {tab.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
