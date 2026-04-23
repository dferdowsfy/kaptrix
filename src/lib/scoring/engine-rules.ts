// Kaptrix Deterministic Scoring Engine — intake rule table.
//
// Each rule maps ONE intake field → zero or more sub-criterion signals.
// Rules are declarative, pure, and deterministic. The value space of
// every rule is small (enum-like) or matched against stable regex
// fragments, so the rule table itself acts as audit documentation for
// how intake responses influence scoring.
//
// ── Authoring guidelines ─────────────────────────────────────────────
// 1. A rule's `apply` MUST be pure — no Date.now, no Math.random.
// 2. Deltas are signed shifts from the 2.5 baseline; magnitudes are
//    conservative (±0.4 – ±1.2) so stacked signals stay meaningful but
//    cannot overwhelm a single guardrail.
// 3. Every signal MUST carry a `reason` — it becomes part of the
//    per-sub-criterion rationale.
// 4. Unknown / empty values should produce NO signals (not a zero
//    signal) so the engine can treat the sub-criterion as "insufficient".

import type { ScoreDimension } from "@/lib/types";

export interface IntakeSubSignal {
  dimension: ScoreDimension;
  sub_criterion: string;
  /** Signed shift from the 2.5 baseline. Bounded to [-1.5, +1.5] per signal. */
  delta: number;
  reason: string;
}

export interface IntakeRule {
  id: string;
  field: string;
  apply: (value: unknown) => IntakeSubSignal[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") return [v];
  return [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function matchesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(value));
}

// ── Rule table ───────────────────────────────────────────────────────
//
// Rule IDs follow `<domain>.<field>.<qualifier>` and must remain stable;
// changing an ID breaks the canonical input hash for historical runs.

export const INTAKE_RULES: IntakeRule[] = [
  // ── Regulatory exposure ───────────────────────────────────────────
  {
    id: "regulatory.exposure.material",
    field: "regulatory_exposure",
    apply: (value) => {
      const items = asStringArray(value).filter((r) => !/^none/i.test(r));
      if (items.length === 0) return [];
      const magnitude = Math.min(3, items.length);
      return [
        {
          dimension: "data_sensitivity",
          sub_criterion: "regulated_data",
          delta: -0.3 * magnitude,
          reason: `Client flagged ${items.length} material regulatory exposure(s).`,
        },
        {
          dimension: "governance_safety",
          sub_criterion: "access_controls",
          delta: -0.2 * magnitude,
          reason: "Regulated deals require fine-grained access controls.",
        },
      ];
    },
  },

  // ── Data rights / provenance ──────────────────────────────────────
  {
    id: "data.usage_rights.ambiguous",
    field: "customer_data_usage_rights",
    apply: (value) => {
      const v = asString(value);
      if (!matchesAny(v, [/ambiguous/i, /not documented/i])) return [];
      return [
        {
          dimension: "data_sensitivity",
          sub_criterion: "customer_isolation",
          delta: -0.6,
          reason: "Customer data usage rights are ambiguous / undocumented.",
        },
        {
          dimension: "governance_safety",
          sub_criterion: "access_controls",
          delta: -0.4,
          reason: "Ambiguous data rights elevate governance burden.",
        },
      ];
    },
  },
  {
    id: "data.usage_rights.disciplined",
    field: "customer_data_usage_rights",
    apply: (value) => {
      const v = asString(value);
      if (!matchesAny(v, [/per-tenant isolation/i, /excluded from training/i, /explicit opt-in/i])) {
        return [];
      }
      return [
        {
          dimension: "data_sensitivity",
          sub_criterion: "customer_isolation",
          delta: 0.4,
          reason: "Disciplined customer data handling (isolation / opt-in / exclusion) asserted.",
        },
      ];
    },
  },
  {
    id: "data.training_sources.public_or_unknown",
    field: "training_data_sources",
    apply: (value) => {
      const items = asStringArray(value);
      if (!items.some((s) => /public web scraping|unknown/i.test(s))) return [];
      return [
        {
          dimension: "data_sensitivity",
          sub_criterion: "training_provenance",
          delta: -0.8,
          reason: "Training data includes public scrape or undocumented origin.",
        },
        {
          dimension: "open_validation",
          sub_criterion: "known_unknowns",
          delta: -0.3,
          reason: "Training-data provenance requires validation.",
        },
      ];
    },
  },

  // ── Vendor / tooling posture ──────────────────────────────────────
  {
    id: "tooling.lock_in.zero_tolerance",
    field: "lock_in_tolerance",
    apply: (value) => {
      const v = asString(value);
      if (!/must avoid all lock-in/i.test(v)) return [];
      // Client intolerance doesn't lower the product — it raises the bar.
      // We mark the sub-criteria as "client-sensitive" by nudging them
      // down in the intake layer; artifacts can still validate upward.
      return [
        {
          dimension: "tooling_exposure",
          sub_criterion: "switching_cost",
          delta: -0.5,
          reason: "Client has zero tolerance for vendor / model lock-in.",
        },
        {
          dimension: "tooling_exposure",
          sub_criterion: "model_concentration",
          delta: -0.4,
          reason: "Zero lock-in tolerance elevates model concentration scrutiny.",
        },
      ];
    },
  },

  // ── Operational resilience ────────────────────────────────────────
  {
    id: "production.bcr.tight",
    field: "business_continuity_requirement",
    apply: (value) => {
      const v = asString(value);
      if (!/seconds|minutes/i.test(v)) return [];
      return [
        {
          dimension: "production_readiness",
          sub_criterion: "incident_response",
          delta: -0.4,
          reason: `Tight uptime requirement (${v}) raises the incident-response bar.`,
        },
        {
          dimension: "production_readiness",
          sub_criterion: "scaling",
          delta: -0.3,
          reason: "Tight BCR implies scaling must already be proven at peak.",
        },
      ];
    },
  },
  {
    id: "production.multi_region",
    field: "multi_region_requirement",
    apply: (value) => {
      const v = asString(value);
      if (!v || /us-only|not applicable/i.test(v)) return [];
      return [
        {
          dimension: "production_readiness",
          sub_criterion: "scaling",
          delta: -0.2,
          reason: `Multi-region / residency requirement: ${v}.`,
        },
      ];
    },
  },

  // ── Buyer-side data readiness ─────────────────────────────────────
  {
    id: "buyer.data_readiness.siloed",
    field: "data_readiness",
    apply: (value) => {
      const v = asString(value);
      if (/no central data platform|siloed/i.test(v)) {
        return [
          {
            dimension: "production_readiness",
            sub_criterion: "scaling",
            delta: -0.6,
            reason: "Buyer-side data platform is siloed — integration risk.",
          },
          {
            dimension: "open_validation",
            sub_criterion: "technical_debt",
            delta: -0.3,
            reason: "Siloed data raises integration-side technical debt.",
          },
        ];
      }
      if (/partial data lake/i.test(v)) {
        return [
          {
            dimension: "production_readiness",
            sub_criterion: "scaling",
            delta: -0.3,
            reason: "Buyer-side data platform is partial — integration friction.",
          },
        ];
      }
      return [];
    },
  },

  // ── Decision discipline ───────────────────────────────────────────
  {
    id: "decision.kill_criteria.missing",
    field: "kill_criteria",
    apply: (value) => {
      const v = asString(value).trim();
      if (v.length > 0) return [];
      return [
        {
          dimension: "open_validation",
          sub_criterion: "known_unknowns",
          delta: -0.3,
          reason: "No explicit kill criteria defined.",
        },
      ];
    },
  },
  {
    id: "decision.alternatives.missing",
    field: "alternatives_considered",
    apply: (value) => {
      const items = asStringArray(value);
      if (items.length > 0) return [];
      return [
        {
          dimension: "open_validation",
          sub_criterion: "specialist_review",
          delta: -0.3,
          reason: "No alternatives weighed against this choice.",
        },
      ];
    },
  },

  // ── Artifacts received (posture hints) ────────────────────────────
  {
    id: "intake.artifacts.received",
    field: "artifacts_received",
    apply: (value) => {
      const items = asStringArray(value).map((s) => s.toLowerCase());
      const signals: IntakeSubSignal[] = [];
      if (items.some((a) => /soc 2|iso 27001/.test(a))) {
        signals.push({
          dimension: "governance_safety",
          sub_criterion: "access_controls",
          delta: 0.3,
          reason: "SOC 2 / ISO 27001 artifact asserted by client.",
        });
      }
      if (items.some((a) => /model \/ ai system documentation/.test(a))) {
        signals.push({
          dimension: "product_credibility",
          sub_criterion: "ai_value_vs_wrapper",
          delta: 0.3,
          reason: "Model / AI system documentation asserted.",
        });
      }
      if (items.some((a) => /benchmark|evaluation/.test(a))) {
        signals.push({
          dimension: "product_credibility",
          sub_criterion: "customer_vs_claimed",
          delta: 0.3,
          reason: "Benchmark / evaluation artifact asserted.",
        });
      }
      return signals;
    },
  },

  // ── Prior red flags from intake ───────────────────────────────────
  {
    id: "intake.red_flag_priors",
    field: "red_flag_priors",
    apply: (value) => {
      const items = asStringArray(value);
      if (items.length === 0) return [];
      const magnitude = Math.min(3, items.length);
      return [
        {
          dimension: "open_validation",
          sub_criterion: "known_unknowns",
          delta: -0.3 * magnitude,
          reason: `Prior red-flag concerns carried from intake (${items.length}).`,
        },
      ];
    },
  },
];
