// POST /api/scores/engine
//
// Runs the deterministic scoring engine against caller-provided intake
// responses, artifact evidence, and (optional) reviewer notes. Returns
// the structured per-sub-criterion output documented in engine-types.ts.
//
// Determinism: same body → byte-identical response (modulo transport).
// The engine is pure; this route is a thin validation + dispatch layer.

import { NextResponse } from "next/server";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import { runScoringEngine } from "@/lib/scoring/engine";
import type {
  ArtifactEvidence,
  IntakeResponse,
  ReviewerNote,
  ScoringEngineInput,
} from "@/lib/scoring/engine-types";
import type { ScoreDimension } from "@/lib/types";
import {
  AuthError,
  assertPreviewTabVisible,
  authErrorResponse,
  requireAuth,
} from "@/lib/security/authz";

export const runtime = "nodejs";

// ── Validation ───────────────────────────────────────────────────────

const DIMENSION_KEYS = new Set<ScoreDimension>(
  SCORING_DIMENSIONS.map((d) => d.key),
);
const SUB_KEYS_BY_DIM: Record<ScoreDimension, Set<string>> = Object.fromEntries(
  SCORING_DIMENSIONS.map((d) => [d.key, new Set(d.sub_criteria.map((s) => s.key))]),
) as Record<ScoreDimension, Set<string>>;

const ARTIFACT_KINDS = new Set([
  "document",
  "pre_analysis",
  "insight",
  "coverage",
  "benchmark",
]);

const ARTIFACT_SIGNALS = new Set([
  "supports_high",
  "supports_mid",
  "supports_low",
  "contradicts",
]);

function isKnownSub(dim: unknown, sub: unknown): boolean {
  if (typeof dim !== "string" || typeof sub !== "string") return false;
  if (!DIMENSION_KEYS.has(dim as ScoreDimension)) return false;
  return SUB_KEYS_BY_DIM[dim as ScoreDimension].has(sub);
}

function validateIntake(v: unknown): { ok: true; value: IntakeResponse[] } | { ok: false; error: string } {
  if (!Array.isArray(v)) return { ok: false, error: "intake must be an array" };
  const out: IntakeResponse[] = [];
  for (const [i, raw] of v.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `intake[${i}] must be an object` };
    }
    const r = raw as Record<string, unknown>;
    if (typeof r.field !== "string" || r.field.length === 0) {
      return { ok: false, error: `intake[${i}].field must be a non-empty string` };
    }
    // Allow string | string[] | number | boolean | null
    const val = r.value;
    const valOk =
      val === null ||
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean" ||
      (Array.isArray(val) && val.every((x) => typeof x === "string"));
    if (!valOk) {
      return {
        ok: false,
        error: `intake[${i}].value must be string | string[] | number | boolean | null`,
      };
    }
    out.push({ field: r.field, value: val as IntakeResponse["value"] });
  }
  return { ok: true, value: out };
}

function validateArtifacts(
  v: unknown,
): { ok: true; value: ArtifactEvidence[] } | { ok: false; error: string } {
  if (!Array.isArray(v)) return { ok: false, error: "artifacts must be an array" };
  const out: ArtifactEvidence[] = [];
  for (const [i, raw] of v.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `artifacts[${i}] must be an object` };
    }
    const a = raw as Record<string, unknown>;
    if (typeof a.id !== "string" || !a.id) {
      return { ok: false, error: `artifacts[${i}].id must be a non-empty string` };
    }
    if (typeof a.kind !== "string" || !ARTIFACT_KINDS.has(a.kind)) {
      return { ok: false, error: `artifacts[${i}].kind is invalid` };
    }
    if (!isKnownSub(a.dimension, a.sub_criterion)) {
      return {
        ok: false,
        error: `artifacts[${i}] unknown dimension/sub_criterion`,
      };
    }
    if (typeof a.signal !== "string" || !ARTIFACT_SIGNALS.has(a.signal)) {
      return { ok: false, error: `artifacts[${i}].signal is invalid` };
    }
    if (typeof a.claim !== "string" || a.claim.length < 1) {
      return { ok: false, error: `artifacts[${i}].claim must be a non-empty string` };
    }
    if (a.locator !== undefined && typeof a.locator !== "string") {
      return { ok: false, error: `artifacts[${i}].locator must be a string when set` };
    }
    out.push({
      id: a.id,
      kind: a.kind as ArtifactEvidence["kind"],
      dimension: a.dimension as ScoreDimension,
      sub_criterion: a.sub_criterion as string,
      signal: a.signal as ArtifactEvidence["signal"],
      claim: a.claim,
      locator: (a.locator as string | undefined) ?? undefined,
    });
  }
  return { ok: true, value: out };
}

function validateReviewerNotes(
  v: unknown,
): { ok: true; value: ReviewerNote[] } | { ok: false; error: string } {
  if (v === undefined) return { ok: true, value: [] };
  if (!Array.isArray(v)) {
    return { ok: false, error: "reviewer_notes must be an array when supplied" };
  }
  const out: ReviewerNote[] = [];
  for (const [i, raw] of v.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `reviewer_notes[${i}] must be an object` };
    }
    const n = raw as Record<string, unknown>;
    if (!isKnownSub(n.dimension, n.sub_criterion)) {
      return {
        ok: false,
        error: `reviewer_notes[${i}] unknown dimension/sub_criterion`,
      };
    }
    if (typeof n.delta !== "number" || !Number.isFinite(n.delta)) {
      return { ok: false, error: `reviewer_notes[${i}].delta must be a finite number` };
    }
    if (typeof n.rationale !== "string" || n.rationale.length < 20) {
      return {
        ok: false,
        error: `reviewer_notes[${i}].rationale must be a string of ≥20 characters`,
      };
    }
    out.push({
      dimension: n.dimension as ScoreDimension,
      sub_criterion: n.sub_criterion as string,
      delta: n.delta,
      rationale: n.rationale,
    });
  }
  return { ok: true, value: out };
}

// ── Handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Public preview callers are allowed (the engine has no side-effects
  // and contains no PII). Authenticated operators still respect tab
  // visibility to mirror /api/scores/suggest behaviour.
  try {
    const ctx = await requireAuth();
    assertPreviewTabVisible(ctx, "scoring");
  } catch (err) {
    if (!(err instanceof AuthError) || err.status !== 401) {
      return authErrorResponse(err);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const intake = validateIntake(body.intake ?? []);
  if (!intake.ok) return NextResponse.json({ error: intake.error }, { status: 400 });

  const artifacts = validateArtifacts(body.artifacts ?? []);
  if (!artifacts.ok) return NextResponse.json({ error: artifacts.error }, { status: 400 });

  const reviewer = validateReviewerNotes(body.reviewer_notes);
  if (!reviewer.ok) return NextResponse.json({ error: reviewer.error }, { status: 400 });

  const input: ScoringEngineInput = {
    intake: intake.value,
    artifacts: artifacts.value,
    reviewer_notes: reviewer.value,
  };

  const output = runScoringEngine(input);
  return NextResponse.json(output);
}
