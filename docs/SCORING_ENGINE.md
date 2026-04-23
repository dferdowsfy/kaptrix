# Kaptrix Scoring Engine

> **STRUCTURE, NORMALIZE, and COMPILE.** Kaptrix is an evidence system,
> not a generative opinion system. The scoring engine produces
> deterministic, evidence-backed, per-sub-criterion scoring inputs that
> feed the existing composite calculator.

This document is the spec for `src/lib/scoring/engine.ts` and the
`/api/scores/engine` route, plus the gap analysis that motivated them.

---

## 1. Core principle

Kaptrix scoring is deterministic and evidence-weighted. The engine:

- **Does NOT** decide scores freely
- **Does NOT** re-interpret inputs differently on each run
- **Does NOT** generate new scores unless inputs change
- **Does** map intake responses + artifact evidence to sub-criteria
- **Does** apply fixed scoring rules
- **Does** output structured sub-scores, confidence, and rationale

The engine is **not** the final scorer. Dimension scores and the
composite are computed downstream by
[`calculateCompositeScore`](../src/lib/scoring/calculator.ts) and
[`calculateFinalScore`](../src/lib/scoring/calculator.ts) using the
existing deterministic formulas.

## 2. Inputs

1. **Intake responses** — `IntakeResponse[]`. Structured, self-reported
   values keyed by canonical field name
   (e.g. `customer_data_usage_rights`, `training_data_sources`).
2. **Artifact evidence** — `ArtifactEvidence[]`. Pre-tagged items with
   `dimension`, `sub_criterion`, `signal`
   (`supports_high | supports_mid | supports_low | contradicts`),
   `claim`, optional `locator`. Tagging happens upstream (LLM extraction,
   pre-analysis, operator classification); the engine consumes tagged
   artifacts deterministically.
3. **Reviewer notes** — `ReviewerNote[]`. Bounded overrides keyed to a
   sub-criterion; `delta` is clamped to ±0.5.

## 3. Source hierarchy

```
Tier 1  (highest):  Artifact evidence
Tier 2:             Intake responses
Tier 3:             Reviewer notes (bounded, must carry ≥20-char rationale)
```

Rules:

- Artifacts override intake on conflict
- Intake alone cannot justify a high-confidence or maximum score
- Reviewer notes can nudge but cannot break guardrails

## 4. Output shape

For every one of the 24 sub-criteria the engine emits:

```jsonc
{
  "name":                 "data_sensitivity.customer_isolation",
  "dimension":            "data_sensitivity",
  "sub_criterion":        "customer_isolation",
  "score":                2.0,             // 0–5, snapped to 0.5
  "confidence":           "MEDIUM",        // LOW | MEDIUM | HIGH
  "source_mix":           "contradictory", // insufficient | intake_only | artifact_only | artifact_supported | contradictory
  "contradiction_flag":   true,
  "evidence_references":  ["arch-doc-12"],
  "rationale":            "..."
}
```

Top-level envelope:

```jsonc
{
  "sub_criteria":     [ /* 24 items */ ],
  "inputs_hash":      "<sha256 of canonical input>",
  "schema_version":   "kaptrix.engine@1"
}
```

## 5. Deterministic rules

Constants (code of record: `src/lib/scoring/engine.ts`):

| Rule                              | Value     |
|-----------------------------------|-----------|
| Baseline                          | 2.5       |
| Intake-only floor                 | 1.5       |
| Intake-only ceiling               | 3.5       |
| No-artifact score cap             | 3.0       |
| High-band floor (needs artifact)  | 4.0       |
| Per-intake-signal clamp           | ±1.5      |
| Intake net clamp per sub          | ±2.0      |
| Per-artifact clamp                | ±1.5      |
| Artifact net clamp per sub        | ±2.5      |
| Contradiction penalty (per item)  | −0.5      |
| Reviewer note clamp               | ±0.5      |

### Source mix

| Case              | Source mix         | Confidence rule            |
|-------------------|--------------------|----------------------------|
| No inputs         | `insufficient`     | LOW, score = 0             |
| Intake only       | `intake_only`      | LOW, score ∈ [1.5, 3.5]    |
| Artifact only     | `artifact_only`    | MEDIUM (1) / HIGH (≥2)     |
| Intake + artifact | `artifact_supported` | MEDIUM (1) / HIGH (≥2)   |
| Any contradiction | `contradictory`    | MEDIUM (1) / HIGH (≥2)     |

### Guardrails

- **Intake-only cap**: hard bounded `[1.5, 3.5]`
- **Missing-evidence cap**: without any artifact, score ≤ 3
- **High-band rule**: score ≥ 4 requires at least one non-contradicting
  supporting artifact; otherwise demoted to 3.5
- **Reviewer cannot break guardrails**: a reviewer note of +0.5 cannot
  push an intake-only sub-criterion past 3.0

### Contradiction handling

A single `contradicts` artifact:

- raises `contradiction_flag = true`
- sets `source_mix = "contradictory"` (regardless of intake)
- applies a −0.5 penalty per contradicting item
- sets confidence to MEDIUM (one contradiction) or HIGH (≥2)

## 6. Determinism guarantees

- Pure function: no I/O, no clocks, no random.
- Canonical input: intake is sorted by `field`, artifacts by `id`,
  reviewer notes by `dimension.sub_criterion::rationale`; array values
  are sorted in-place.
- `inputs_hash` is SHA-256 of the canonical JSON string. Same inputs →
  byte-identical hash and output.

Tested in `tests/unit/scoring/engine.test.ts`:

- `same inputs → identical output (incl. hash)`
- `ordering of intake / artifacts / notes does not change output`
- `hash changes when a single field changes`

## 7. Wire-up

### API route

`POST /api/scores/engine`

Body:

```jsonc
{
  "intake":   [ { "field": "...", "value": ... } ],
  "artifacts": [ { "id": "...", "kind": "document", "dimension": "...", "sub_criterion": "...", "signal": "supports_high", "claim": "...", "locator": "p.7" } ],
  "reviewer_notes": [ { "dimension": "...", "sub_criterion": "...", "delta": 0.25, "rationale": "≥20 chars" } ]  // optional
}
```

Response: the `ScoringEngineOutput` shape above.

### Adapter

`engineOutputToScores(engagementId, output)` converts engine output
into the existing `Score[]` shape so the result can flow into
`ScoringPanel`, `calculateCompositeScore`, and `calculateFinalScore`
without a parallel rendering path.

---

## Gap analysis (what changed, and why)

This section documents the gaps that existed in the scoring stack
before this engine was added.

### G1 · LLM-based suggestion is non-deterministic

`src/app/api/scores/suggest/route.ts` runs six parallel LLM calls with
`temperature: 0.1`. Temperature > 0 still drifts between runs, so
identical inputs do **not** guarantee identical outputs. The spec
requires determinism.

**Filled by**: `runScoringEngine` is a pure function; the hash test
asserts byte-equality on repeat runs.

### G2 · No per-sub-criterion confidence

`src/lib/scoring/confidence.ts` computes a single **engagement-level**
0–1 confidence composite (coverage, quality, recency, consistency).
The spec requires LOW/MEDIUM/HIGH **per sub-criterion**.

**Filled by**: every `SubCriterionEngineOutput` carries its own
`confidence` field, computed from the count and mix of supporting /
contradicting artifacts.

### G3 · No source-mix / source-hierarchy field

Existing outputs (LLM `SuggestedScore`, DB `Score`) carry a score and a
rationale but no machine-readable source provenance. The spec requires
each sub-criterion to declare whether it is `intake_only`,
`artifact_supported`, `artifact_only`, `contradictory`, or
`insufficient`.

**Filled by**: `source_mix` on every sub-criterion output, computed
deterministically from the bucket contents.

### G4 · No contradiction flag

Adjustment proposals (`AdjustmentProposal`) can carry deltas, but there
is no explicit flag that says "this sub-criterion has artifacts
contradicting intake." A reader of the final scorecard could not tell a
"3.0 because evidence is thin" from a "3.0 because evidence directly
contradicts intake."

**Filled by**: `contradiction_flag: boolean` per sub-criterion, with
the `contradictory` source mix and a per-item −0.5 penalty.

### G5 · No intake-only cap

An operator (or the LLM) could previously assign a 5.0 to a sub-criterion
based purely on intake self-report. The spec prohibits this ("intake
alone CANNOT produce a top score").

**Filled by**: the `[1.5, 3.5]` hard cap on intake-only scores, plus
the `no-artifact → ≤3` cap and the `≥4 requires supporting artifact`
guardrail. Enforced by tests.

### G6 · No missing-evidence treatment

Previously, missing evidence silently produced a low-confidence score
with no explicit cap. The spec requires unknowns to lower confidence
AND cap the maximum score (cannot exceed 3 without artifacts).

**Filled by**: the no-artifact cap and `source_mix = insufficient` when
neither intake nor artifact signals exist for a sub-criterion.

### G7 · No formal reviewer-override path

Reviewer input was only expressible via `AdjustmentProposal` rows,
which are designed for evidence-driven deltas from pre-analysis /
artifacts — not reviewer judgment. The spec treats reviewer notes as a
distinct tier that can adjust but must not break scoring rules.

**Filled by**: `ReviewerNote[]` input, bounded delta clamp (±0.5), and
guardrail enforcement that a reviewer cannot push a sub-criterion into
the ≥4 band without artifact support.

### G8 · No evidence-reference array per sub-criterion

Existing `Score.evidence_citations` is a free-form array operators fill
in manually. The engine now populates `evidence_references` from the
tagged artifacts automatically, preserving the audit trail end-to-end.

### G9 · Rule table opacity

The LLM prompt in `scores/suggest` contained the full rubric but
applied it probabilistically. The intake → sub-criterion mapping was
invisible to reviewers.

**Filled by**: `src/lib/scoring/engine-rules.ts` — a declarative rule
table with stable IDs. Each rule names the intake field, the target
sub-criterion, the delta magnitude, and the reason. The table is the
audit trail.

---

## Open gaps / follow-ups

These remain after this change and are tracked separately:

1. **UI surface**. The engine is exposed via `/api/scores/engine` but
   the preview and dashboard scoring pages still call
   `/api/scores/suggest`. A follow-up should add an "Engine mode" toggle
   or replace the LLM suggestion path entirely for operators who have
   pre-tagged artifacts. The adapter `engineOutputToScores` is ready for
   this hookup.
2. **Artifact tagging pipeline**. `ArtifactEvidence` requires
   `(dimension, sub_criterion, signal)`. The preview workspace's
   `extracted-insights` and `pre_analysis` payloads can be mapped to
   this shape, but a dedicated tagger service / prompt version is out
   of scope for this change.
3. **Rule coverage**. The rule table in `engine-rules.ts` covers the
   intake fields that already have mature vocabulary in
   `src/lib/scoring/context.ts`. Extending coverage to every intake
   field (especially post-close lifecycle fields) is an incremental
   authoring task.
4. **Rule versioning**. Every change to the rule table or the constants
   in Section 5 changes the effective rubric. A `RULE_TABLE_VERSION`
   hash should be persisted with each engine run so historical outputs
   can be replayed against the rubric that produced them.
5. **Persistence**. Engine outputs are currently computed on-demand.
   Adding a `scoring_engine_runs` table (indexed by `inputs_hash`) would
   let operators diff runs and detect when an evidence change moved a
   score — complementing the existing `score_history` append-only log.
