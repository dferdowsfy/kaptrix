import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; route: string }
> = {
  intake: { label: "Intake", color: "bg-amber-100 text-amber-800", route: "intake" },
  evidence: { label: "Evidence", color: "bg-sky-100 text-sky-800", route: "evidence" },
  insights: { label: "Insights", color: "bg-violet-100 text-violet-800", route: "insights" },
  scoring: { label: "Scoring", color: "bg-emerald-100 text-emerald-800", route: "scoring" },
  positioning: { label: "Positioning", color: "bg-orange-100 text-orange-800", route: "positioning" },
  shortlist: { label: "Shortlist", color: "bg-pink-100 text-pink-800", route: "shortlist" },
  report: { label: "Report", color: "bg-slate-100 text-slate-700", route: "report" },
};

export default async function CategoryOverviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: engagement },
    { data: profile },
    { data: intake },
    { data: assumptions },
    { data: evidence },
    { data: shortlist },
    { data: scores },
    { data: report },
  ] = await Promise.all([
    supabase
      .from("engagements")
      .select("id, client_firm_name, status, created_at, tier, deal_stage")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("engagement_category_profile")
      .select("category_name, thesis, time_horizon_months, peer_categories, category_slug")
      .eq("engagement_id", id)
      .maybeSingle(),
    supabase
      .from("mi_intake_questions")
      .select("status, confirmed_at, generated_at")
      .eq("engagement_id", id)
      .maybeSingle(),
    supabase
      .from("mi_thesis_assumptions")
      .select("id, evidence_status")
      .eq("engagement_id", id),
    supabase
      .from("mi_evidence_items")
      .select("id")
      .eq("engagement_id", id),
    supabase
      .from("mi_shortlist_companies")
      .select("id")
      .eq("engagement_id", id),
    supabase
      .from("mi_scores")
      .select("score_0_to_5")
      .eq("engagement_id", id),
    supabase
      .from("mi_reports")
      .select("version, generated_at")
      .eq("engagement_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!engagement) notFound();

  const assumptionList = assumptions ?? [];
  const evidenceCount = evidence?.length ?? 0;
  const shortlistCount = shortlist?.length ?? 0;
  const scoreList = scores ?? [];
  const supportedCount = assumptionList.filter(
    (a) => a.evidence_status === "supported",
  ).length;
  const compositeScore =
    scoreList.length > 0
      ? scoreList.reduce((sum, s) => sum + Number(s.score_0_to_5), 0) /
        scoreList.length
      : null;
  const peers = Array.isArray(profile?.peer_categories)
    ? (profile.peer_categories as string[])
    : [];

  const stages = [
    {
      id: "intake",
      label: "Intake",
      status: intake
        ? intake.status === "confirmed"
          ? "confirmed"
          : "generated"
        : "pending",
      lastRun: intake?.confirmed_at ?? intake?.generated_at ?? null,
    },
    {
      id: "evidence",
      label: "Evidence",
      status: evidenceCount > 0 ? "active" : "pending",
      lastRun: null,
    },
    {
      id: "insights",
      label: "Insights",
      status: "pending",
      lastRun: null,
    },
    {
      id: "scoring",
      label: "Scoring",
      status: scoreList.length > 0 ? "generated" : "pending",
      lastRun: null,
    },
    {
      id: "positioning",
      label: "Positioning",
      status: "pending",
      lastRun: null,
    },
    {
      id: "shortlist",
      label: "Shortlist",
      status: shortlistCount > 0 ? "active" : "pending",
      lastRun: null,
    },
    {
      id: "report",
      label: "Report",
      status: report ? "generated" : "pending",
      lastRun: report?.generated_at ?? null,
    },
  ];

  function stageColor(status: string) {
    if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
    if (status === "generated" || status === "active")
      return "bg-violet-100 text-violet-700";
    return "bg-slate-100 text-slate-500";
  }

  return (
    <div className="space-y-8">
      {/* Thesis header */}
      <div className="rounded-2xl border border-fuchsia-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-600">
              {profile?.category_slug ?? "category"} · {engagement.tier} ·{" "}
              {engagement.deal_stage.replace(/_/g, " ")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {profile?.category_name ?? engagement.client_firm_name}
            </h2>
            {profile?.thesis ? (
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                {profile.thesis}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-slate-400">
                No thesis set yet — edit the engagement to add one.
              </p>
            )}
          </div>
          <div className="shrink-0 text-right text-xs text-slate-400">
            <div>Created {formatDate(engagement.created_at)}</div>
            {profile?.time_horizon_months && (
              <div className="mt-1">Horizon: {profile.time_horizon_months} months</div>
            )}
          </div>
        </div>

        {peers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs font-medium text-slate-500">
              Peer categories:
            </span>
            {peers.map((p) => (
              <span
                key={p}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Assumptions"
          value={assumptionList.length}
          subtext={
            assumptionList.length > 0
              ? `${supportedCount} supported`
              : undefined
          }
        />
        <StatCard
          label="Evidence Items"
          value={evidenceCount}
        />
        <StatCard
          label="Shortlist Companies"
          value={shortlistCount}
        />
        <StatCard
          label="Composite Score"
          value={compositeScore !== null ? `${compositeScore.toFixed(1)}/5` : "—"}
          subtext={scoreList.length > 0 ? `${scoreList.length} dimensions` : undefined}
        />
      </div>

      {/* Stage status grid */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Stage Status
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <a
              key={stage.id}
              href={`/category/${id}/${stage.id}`}
              className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-fuchsia-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-fuchsia-700">
                  {stage.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stageColor(stage.status)}`}
                >
                  {stage.status}
                </span>
              </div>
              {stage.lastRun && (
                <p className="text-[11px] text-slate-400">
                  Last run {formatDate(stage.lastRun)}
                </p>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number | string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {subtext && (
        <p className="mt-0.5 text-xs text-slate-400">{subtext}</p>
      )}
    </div>
  );
}
