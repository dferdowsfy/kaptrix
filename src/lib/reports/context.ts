import "server-only";
import type { getPreviewSnapshot } from "@/lib/preview/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatKnowledgeBaseEvidence,
  type KnowledgeStep,
  type KnowledgeEntry,
} from "@/lib/preview/kb-format";
import {
  buildCommercialPainSummary,
  formatCommercialPainSummaryForEvidence,
  type CommercialPainSummary,
  type CommercialPainSummaryInput,
} from "@/lib/scoring/commercial-pain";

type Snapshot = Awaited<ReturnType<typeof getPreviewSnapshot>>;

/**
 * Assemble the full evidence context passed to report generation
 * prompts. Every platform data source the LLM is allowed to see is
 * rendered here so reports reflect ALL inputted data, not a subset.
 *
 * Truncated to `maxChars` to stay inside provider context windows.
 */
/**
 * Snapshots may carry a Phase-1 `commercial_pain_inputs` field once that
 * landing happens. Until then the field is undefined and the summary is
 * null, which surfaces "Commercial Pain Validation not yet completed" in
 * every report.
 */
type SnapshotWithCommercialPain = Snapshot & {
  commercial_pain_inputs?: CommercialPainSummaryInput | null;
};

/**
 * Compute the shared commercial_pain_summary for a snapshot. Centralized
 * here so reports + chat read from the same builder and never invent
 * commercial pain content of their own.
 */
export function getCommercialPainSummary(
  snapshot: Snapshot,
): CommercialPainSummary | null {
  const inputs = (snapshot as SnapshotWithCommercialPain).commercial_pain_inputs;
  return buildCommercialPainSummary(inputs ?? null);
}

export function buildReportEvidenceContext(
  snapshot: Snapshot,
  opts: { maxChars?: number } = {},
): string {
  const maxChars = opts.maxChars ?? 110_000;
  const parts: string[] = [];

  const eng = snapshot.engagement;
  const rep = snapshot.executiveReport;

  parts.push(
    `ENGAGEMENT: target=${eng.target_company_name}, client=${eng.client_firm_name}, deal_stage=${eng.deal_stage}, status=${eng.status}, tier=${eng.tier}, industry=${rep.industry || "(unspecified)"}.`,
  );

  // ----- Commercial Pain Summary (CANONICAL shared input) -----
  // Every report and the chat endpoint read commercial pain content from
  // this block. Placed near the top of the evidence so the model sees it
  // before context-window truncation can clip it.
  parts.push(formatCommercialPainSummaryForEvidence(getCommercialPainSummary(snapshot)));

  // ----- Executive report: full contents -----
  parts.push(
    `[executive · recommendation] ${rep.recommendation} | confidence=${rep.confidence} | composite=${rep.composite_score}`,
  );
  if (rep.executive_summary) parts.push(`[executive · summary] ${rep.executive_summary}`);
  if (rep.strategic_context) parts.push(`[executive · strategic context] ${rep.strategic_context}`);
  rep.top_three_takeaways.forEach((t) => {
    parts.push(`[takeaway] ${t.headline} — ${t.detail}`);
  });
  if (rep.dimension_scores) {
    const ds = rep.dimension_scores;
    parts.push(
      `[dimension scores] product_credibility=${ds.product_credibility}, tooling_exposure=${ds.tooling_exposure}, data_sensitivity=${ds.data_sensitivity}, governance_safety=${ds.governance_safety}, production_readiness=${ds.production_readiness}, open_validation=${ds.open_validation}`,
    );
  }
  rep.risk_heat_map.forEach((r) => {
    parts.push(
      `[risk · ${r.category}] ${r.risk} (likelihood ${r.likelihood}, impact ${r.impact})`,
    );
  });
  rep.critical_findings.forEach((f) => {
    parts.push(
      `[finding · ${f.severity}] ${f.title}. ${f.what_we_found}. Why it matters: ${f.why_it_matters}. Evidence: ${f.operator_evidence}`,
    );
  });
  rep.strategic_implications.forEach((s) => {
    parts.push(`[strategic implication · ${s.theme}] ${s.narrative}`);
  });
  rep.value_creation_levers.forEach((l) => {
    parts.push(`[value lever · ${l.time_horizon}] ${l.lever} — ${l.thesis}`);
  });
  rep.recommended_conditions.forEach((c) => {
    parts.push(`[condition] ${c.condition} (owner ${c.owner}). ${c.rationale}`);
  });
  rep.open_validation.forEach((o) => {
    parts.push(`[open validation] ${o}`);
  });

  // ----- Knowledge insights (document-derived) -----
  snapshot.knowledgeInsights.forEach((k) => {
    parts.push(`[${k.source_document}] ${k.insight} — excerpt: ${k.excerpt}`);
  });

  // ----- Pre-analysis artifacts -----
  snapshot.analyses.forEach((a) => {
    a.extracted_claims.forEach((c) => {
      parts.push(`[${c.source_doc} ${c.source_location}] claim: ${c.claim}`);
    });
    a.red_flags.forEach((f) => {
      parts.push(
        `[red flag · ${f.severity} · ${f.dimension}] ${f.flag} — ${f.evidence}`,
      );
    });
    a.regulatory_signals.forEach((r) => {
      parts.push(
        `[regulatory · ${r.exposure_level}] ${r.regulation} — ${r.relevance}`,
      );
    });
    a.open_questions.forEach((q) => parts.push(`[open question] ${q}`));
    a.vendor_dependencies.forEach((v) => parts.push(`[vendor] ${v}`));
    a.model_dependencies.forEach((m) => parts.push(`[model] ${m}`));
  });

  // ----- Scores (sub-criterion granularity with operator rationale) -----
  snapshot.scores.forEach((s) => {
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)} — ${s.operator_rationale}`,
    );
  });

  // ----- Document inventory -----
  snapshot.documents.forEach((d) => {
    parts.push(
      `[document] ${d.filename} (${d.category}, parse=${d.parse_status}, tokens=${d.token_count ?? "?"})`,
    );
  });

  // ----- Document requirements / coverage gaps -----
  snapshot.requirements.forEach((r) => {
    const tag = r.is_required ? "required" : "optional";
    parts.push(
      `[requirement · ${tag} · weight=${r.weight}] ${r.display_name} (${r.category}). ${r.description}. If missing: ${r.limits_when_missing}`,
    );
  });

  // ----- Benchmark cases (historical analogs in the scoring engine) -----
  snapshot.benchmarks.forEach((b) => {
    const tagStr = b.tags?.length ? ` tags=[${b.tags.join(", ")}]` : "";
    parts.push(
      `[benchmark · ${b.case_anchor_id}] vertical=${b.vertical}, deal_size=${b.deal_size_band}, architecture=${b.ai_architecture_type}, composite=${b.composite_score ?? "?"}.${tagStr} ${b.war_story_summary}`,
    );
  });

  // ----- Pattern matches (similarity-ranked analogs for this deal) -----
  snapshot.patternMatches
    .slice()
    .sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
    .forEach((p) => {
      const confirmed =
        p.operator_confirmed === true
          ? "confirmed"
          : p.operator_confirmed === false
            ? "rejected"
            : "unreviewed";
      parts.push(
        `[pattern match · similarity=${(p.similarity_score ?? 0).toFixed(2)} · ${confirmed}] case=${p.case_anchor_id} — ${p.similarity_reason}`,
      );
    });

  const joined = parts.join("\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
}

/**
 * Read the operator knowledge base from `user_workspace_state` for a
 * given user + engagement and format it as a plain-text evidence block.
 *
 * Returns an empty string when unauthenticated, offline, or if no KB
 * exists yet. Falls back gracefully so reports still generate from
 * the snapshot evidence alone.
 */
export async function readKnowledgeBaseText(
  userId: string,
  engagementId: string,
  opts: { maxChars?: number } = {},
): Promise<string> {
  const maxChars = opts.maxChars ?? 24_000;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("user_workspace_state")
      .select("state")
      .eq("user_id", userId)
      .eq("engagement_id", engagementId)
      .eq("kind", "knowledge_base")
      .maybeSingle();

    if (!data?.state) return "";

    const entries = data.state as Partial<Record<KnowledgeStep, KnowledgeEntry>>;

    // For reports: exclude stale entries so the LLM doesn't produce a
    // deliverable based on superseded upstream data.
    const fresh = Object.fromEntries(
      (Object.entries(entries) as [KnowledgeStep, KnowledgeEntry | undefined][]).filter(
        ([, e]) => e && !e.stale,
      ),
    ) as Partial<Record<KnowledgeStep, KnowledgeEntry>>;

    const text = formatKnowledgeBaseEvidence(fresh).join("\n");
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  } catch {
    return "";
  }
}
