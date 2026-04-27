"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  getClientIndustry,
  type PreviewAnswers,
} from "@/lib/preview-intake";
import {
  submitToKnowledgeBase,
  type IntakePayload,
} from "@/lib/preview/knowledge-base";
import type { Industry } from "@/lib/industry-requirements";

// Per-engagement local cache. Replaces the single global key that was
// causing answers to vanish on logout and overwrite each other across
// clients. The legacy global key is still read once as a migration
// source so existing in-progress drafts aren't lost.
const LEGACY_STORAGE_KEY = PREVIEW_INTAKE_STORAGE_KEY;
function perEngagementKey(id: string): string {
  return `kaptrix.preview.intake.answers.v2:${id}`;
}

const EMPTY: PreviewAnswers = {};

function readLocal(engagementId: string): PreviewAnswers {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(perEngagementKey(engagementId));
    if (raw) return JSON.parse(raw) as PreviewAnswers;
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return JSON.parse(legacy) as PreviewAnswers;
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(engagementId: string, answers: PreviewAnswers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      perEngagementKey(engagementId),
      JSON.stringify(answers),
    );
  } catch {
    // ignore quota errors
  }
}

// Pure helper — converts raw answers into the KB-shaped intake payload.
// Extracted so it can run both inside the submit button AND on every
// change event (to auto-promote intake into the knowledge base so
// downstream modules like scoring / positioning react live, without
// requiring the operator to click "Submit to knowledge base" first).
function buildIntakePayloadFromAnswers(
  answers: PreviewAnswers,
): { payload: IntakePayload; summary: string } {
  const asArray = (v: PreviewAnswers[string] | undefined): string[] =>
    Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
  const asStr = (v: PreviewAnswers[string] | undefined): string | undefined => {
    if (Array.isArray(v)) return v.length ? v.join(", ") : undefined;
    if (v === undefined || v === null || v === "") return undefined;
    return String(v);
  };

  const regulatory_exposure = asArray(answers["regulatory_exposure"]);
  const diligence_priorities = asArray(answers["diligence_priorities"]);
  const red_flag_priors = asArray(answers["red_flag_priors"]);
  const answered_fields = Object.values(answers).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== undefined,
  ).length;

  // Commercial Pain Validation (Phase 1 — first intake section). Built
  // as a nested sub-payload so legacy engagements (no answers) carry
  // `commercial_pain_validation: undefined` and the KB skips emission.
  // Fields containing values are surfaced as intake_claim KB chunks
  // with `requires_artifact_support: true` metadata in the formatter.
  const hasCommercialPainAnswers = [
    "problem_statement",
    "buyer_persona",
    "buyer_persona_notes",
    "pain_severity",
    "pain_frequency",
    "cost_of_pain_categories",
    "cost_of_pain_notes",
    "current_alternative",
    "current_alternative_notes",
    "status_quo_failure",
    "status_quo_failure_notes",
    "customer_demand_evidence",
    "customer_demand_evidence_notes",
    "solution_fit",
    "ai_necessity",
    "ai_necessity_notes",
    "promised_outcome",
    "promised_outcome_notes",
    "outcome_proof",
    "outcome_proof_notes",
    "buying_trigger",
    "buying_trigger_notes",
    "buying_urgency",
    "missing_pain_evidence",
    "missing_pain_evidence_notes",
  ].some((k) => {
    const v = answers[k];
    return Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== undefined;
  });

  const commercial_pain_validation = hasCommercialPainAnswers
    ? {
        problem_statement: asStr(answers["problem_statement"]),
        buyer_persona: asStr(answers["buyer_persona"]),
        buyer_persona_notes: asStr(answers["buyer_persona_notes"]),
        pain_severity: asStr(answers["pain_severity"]),
        pain_frequency: asStr(answers["pain_frequency"]),
        cost_of_pain_categories: asArray(answers["cost_of_pain_categories"]),
        cost_of_pain_notes: asStr(answers["cost_of_pain_notes"]),
        current_alternative: asStr(answers["current_alternative"]),
        current_alternative_notes: asStr(answers["current_alternative_notes"]),
        status_quo_failure: asStr(answers["status_quo_failure"]),
        status_quo_failure_notes: asStr(answers["status_quo_failure_notes"]),
        customer_demand_evidence: asArray(answers["customer_demand_evidence"]),
        customer_demand_evidence_notes: asStr(
          answers["customer_demand_evidence_notes"],
        ),
        solution_fit: asStr(answers["solution_fit"]),
        ai_necessity: asStr(answers["ai_necessity"]),
        ai_necessity_notes: asStr(answers["ai_necessity_notes"]),
        promised_outcome: asStr(answers["promised_outcome"]),
        promised_outcome_notes: asStr(answers["promised_outcome_notes"]),
        outcome_proof: asStr(answers["outcome_proof"]),
        outcome_proof_notes: asStr(answers["outcome_proof_notes"]),
        buying_trigger: asStr(answers["buying_trigger"]),
        buying_trigger_notes: asStr(answers["buying_trigger_notes"]),
        buying_urgency: asStr(answers["buying_urgency"]),
        missing_pain_evidence: asStr(answers["missing_pain_evidence"]),
        missing_pain_evidence_notes: asStr(
          answers["missing_pain_evidence_notes"],
        ),
      }
    : undefined;

  const payload: IntakePayload = {
    kind: "intake",
    answered_fields,
    regulatory_exposure,
    diligence_priorities,
    red_flag_priors,
    commercial_pain_validation,
    engagement_type: asStr(answers["engagement_type"]),
    buyer_archetype: asStr(answers["buyer_archetype"]),
    buyer_industry: asStr(answers["buyer_industry"]),
    target_size_usd: asStr(answers["target_size_usd"]),
    investment_size_usd: asStr(answers["investment_size_usd"]),
    annual_run_rate_usd: asStr(answers["annual_run_rate_usd"]),
    decision_horizon_days: asStr(answers["decision_horizon_days"]),
    deal_thesis: asArray(answers["deal_thesis"]),
    deal_stage: asStr(answers["deal_stage"]),
    internal_sponsor_role: asStr(answers["internal_sponsor_role"]),
    dissenting_voices: asArray(answers["dissenting_voices"]),
    approval_path: asStr(answers["approval_path"]),
    primary_kpi: asArray(answers["primary_kpi"]),
    measurable_targets: asStr(answers["measurable_targets"]),
    kill_criteria: asStr(answers["kill_criteria"]),
    alternatives_considered: asArray(answers["alternatives_considered"]),
    alternatives_detail: asStr(answers["alternatives_detail"]),
    lock_in_tolerance: asStr(answers["lock_in_tolerance"]),
    existing_ai_systems: asArray(answers["existing_ai_systems"]),
    data_readiness: asStr(answers["data_readiness"]),
    training_data_sources: asArray(answers["training_data_sources"]),
    customer_data_usage_rights: asStr(answers["customer_data_usage_rights"]),
    ip_indemnification_needed: asStr(answers["ip_indemnification_needed"]),
    business_continuity_requirement: asStr(
      answers["business_continuity_requirement"],
    ),
    multi_region_requirement: asStr(answers["multi_region_requirement"]),
    artifacts_received: asArray(answers["artifacts_received"]),
    gaps_already_known: asStr(answers["gaps_already_known"]),
    diligence_team_composition: asArray(answers["diligence_team_composition"]),
    context_notes: asStr(answers["context_notes"]),
  };
  const summary = `${answered_fields} fields · ${regulatory_exposure.length} regulatory · ${red_flag_priors.length} prior flags`;
  return { payload, summary };
}

export default function PreviewIntakePage() {
  const { selectedId } = useSelectedPreviewClient();
  const industry: Industry =
    (selectedId ? getClientIndustry(selectedId) : null) ?? "legal_tech";

  // `hydrateToken` flips whenever we load a fresh set of answers for the
  // current engagement so the questionnaire remounts with new initial data.
  const [hydrateToken, setHydrateToken] = useState(0);
  const [answers, setAnswers] = useState<PreviewAnswers>(EMPTY);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate on engagement change: seed from local cache, then try to
  // pull the server copy for the signed-in user and adopt it if present.
  useEffect(() => {
    if (!selectedId) return;
    const local = readLocal(selectedId);
    setAnswers(local);
    setHydrateToken((t) => t + 1);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/preview/intake?engagement_id=${encodeURIComponent(selectedId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          authenticated: boolean;
          answers: PreviewAnswers;
        };
        if (cancelled || !json.authenticated) return;
        const server = json.answers ?? {};
        const hasServer = Object.keys(server).length > 0;
        const hasLocal = Object.keys(local).length > 0;

        if (hasServer) {
          setAnswers(server);
          writeLocal(selectedId, server);
          setHydrateToken((t) => t + 1);
        } else if (hasLocal) {
          // First login on this device with an existing local draft —
          // push it up so it survives the next logout.
          void fetch("/api/preview/intake", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              engagement_id: selectedId,
              answers: local,
            }),
          });
        }
      } catch {
        // offline / network — stick with local cache
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleChange = useCallback(
    (next: PreviewAnswers) => {
      if (!selectedId) return;
      setAnswers(next);
      writeLocal(selectedId, next);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch("/api/preview/intake", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ engagement_id: selectedId, answers: next }),
        }).catch(() => {
          // offline or signed out — local cache still holds the draft
        });
      }, 600);

      // Auto-promote the intake into the preview knowledge base so
      // downstream modules (scoring, positioning, chat) see the latest
      // answers without the operator having to click "Submit to
      // knowledge base" first. Debounced so we don't thrash the KB on
      // every keystroke.
      if (kbTimer.current) clearTimeout(kbTimer.current);
      kbTimer.current = setTimeout(() => {
        try {
          const { payload, summary } = buildIntakePayloadFromAnswers(next);
          if (payload.answered_fields === 0) return;
          submitToKnowledgeBase(selectedId, {
            step: "intake",
            submitted_at: new Date().toISOString(),
            summary,
            payload,
          });
        } catch {
          // best-effort — don't block the UI if KB write fails
        }
      }, 400);
    },
    [selectedId],
  );

  // Flush pending server write before the tab goes away.
  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current || !selectedId) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      try {
        navigator.sendBeacon?.(
          "/api/preview/intake",
          new Blob(
            [JSON.stringify({ engagement_id: selectedId, answers })],
            { type: "application/json" },
          ),
        );
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [answers, selectedId]);

  const buildIntakePayload = useCallback(
    () => buildIntakePayloadFromAnswers(answers),
    [answers],
  );

  const disabledReason =
    Object.keys(answers).length === 0
      ? "Answer at least one intake question before submitting."
      : null;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Guided intake"
        description="Answers save automatically. Navigate sections on the left."
      />
      <IntakeQuestionnaire
        key={`${selectedId}:${hydrateToken}`}
        industry={industry}
        initialAnswers={answers}
        onChange={handleChange}
      />
      <SubmitToKnowledgeBase
        step="intake"
        buildPayload={buildIntakePayload}
        disabledReason={disabledReason}
      />
    </div>
  );
}
