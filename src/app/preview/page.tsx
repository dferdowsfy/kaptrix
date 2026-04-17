"use client";

import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/preview/preview-shell";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import type { PreviewClientSummary } from "@/lib/preview-clients";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PreviewHomePage() {
  const { allClients, selectedId, setSelectedId } = useSelectedPreviewClient();
  const router = useRouter();

  const openClient = (id: string) => {
    setSelectedId(id);
    router.push("/preview/overview");
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionHeader
        eyebrow="Home"
        title="Your active client roster"
        description="Choose an engagement to dive into its intake, coverage, insights, pre-analysis, scoring, and executive report. The selected client stays pinned in the header across every tab."
      />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-2">
        {allClients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            isSelected={c.id === selectedId}
            onOpen={() => openClient(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ClientCard({
  client,
  isSelected,
  onOpen,
}: {
  client: PreviewClientSummary;
  isSelected: boolean;
  onOpen: () => void;
}) {
  const recommendationTone = recommendationToTone(client.recommendation);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 sm:gap-5 sm:p-7
        shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.35)]
        hover:border-indigo-300
        hover:shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_18px_50px_-20px_rgba(79,70,229,0.55)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
      `}
    >
      {isSelected && (
        <span className="absolute right-4 top-4 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200 sm:right-5 sm:top-5">
          Last opened
        </span>
      )}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-600 sm:text-xs">
            {client.industry}
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {client.target}
          </h3>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            {client.client}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:px-3 sm:text-xs
            ${toneClasses(recommendationTone)}`}
        >
          {client.recommendation}
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
        {client.summary}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat
          label="Composite"
          value={
            client.composite_score !== null
              ? client.composite_score.toFixed(1)
              : "—"
          }
        />
        <Stat label="Stage" value={client.deal_stage.replace("_", " ")} />
        <Stat label="Tier" value={client.tier} />
        <Stat label="Fee" value={formatCurrency(client.fee_usd)} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 sm:pt-4 sm:text-sm">
        <span>Due {formatDate(client.deadline)}</span>
        <span className="font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
          Open workspace →
        </span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-2.5 py-2 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}

type Tone = "go" | "warn" | "stop" | "neutral";

function recommendationToTone(rec: string): Tone {
  const r = rec.toLowerCase();
  if (r.startsWith("proceed with")) return "warn";
  if (r.startsWith("proceed")) return "go";
  if (r.startsWith("pause") || r.startsWith("pass")) return "stop";
  return "neutral";
}

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "go":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warn":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "stop":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
