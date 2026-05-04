// Catalog of advanced, on-demand LLM-generated reports surfaced on
// the preview reports page. Each report is triggered explicitly by
// the operator (never auto-run) and pulls the full engagement
// knowledge base for grounding.

export type AdvancedReportId =
  | "master_diligence"
  | "ic_memo"
  | "risk_register"
  | "competitive_posture"
  | "value_creation"
  | "evidence_coverage"
  // AI Category Diligence (Phase 4) — see CATEGORY_ADVANCED_REPORTS below.
  // Tagged with `subject_kind: 'category'` so getAdvancedReportsForSubject
  // can filter the catalog cleanly.
  | "category_qualification_snapshot"
  | "category_structural_risk_map"
  | "category_credibility_analysis"
  | "category_dependency_risk"
  | "category_governance_expectations"
  | "category_production_reality"
  | "category_open_unknowns"
  | "category_investor_diligence_traps"
  | "category_target_screening_criteria"
  | "category_coverage_confidence_summary";

export interface AdvancedReportSection {
  /** Stable id used by the API + client orchestrator. */
  id: string;
  /** Human label shown in progress UI ("Critical Findings"). */
  label: string;
  /** Focused prompt appended to the shared systemPrompt for this slice. */
  instruction: string;
  /** Target output tokens for THIS section. Kept modest to stay inside
   *  the Vercel Pro 300s function timeout on CPU inference. */
  maxTokens: number;
}

export interface AdvancedReportConfig {
  id: AdvancedReportId;
  title: string;
  tagline: string;
  description: string;
  accent: string; // tailwind gradient classes for card header
  eyebrow: string;
  systemPrompt: string;
  userPromptIntro: string;
  /** Optional section breakdown for streamed multi-call generation.
   *  When present, the client orchestrator makes one LLM call per
   *  section and concatenates the markdown. Lets us produce deep,
   *  10-page-scale reports without any single call approaching the
   *  Vercel function timeout. */
  sections?: AdvancedReportSection[];
  /** AI Category Diligence (Phase 4). Defaults to 'target' when omitted
   *  so every existing entry retains its current subject scoping. The
   *  reports UI uses `getAdvancedReportsForSubject` to filter. */
  subject_kind?: import("@/lib/types").SubjectKind;
}

const FORMAT_RULES = `Output format: clean GitHub-flavored markdown.
- Use '#' for the read title (once), '##' for each numbered top-level section, '###' for sub-sections, '####' for small eyebrow labels.
- Use '-' for bullet points. Bullets must be complete thoughts (≥ 15 words); avoid headline-style one-liners.
- Use **bold** for key terms, dollar amounts, SLA thresholds, named vendors/models/products; use *italics* sparingly.
- Paragraphs must be 3-6 sentences (roughly 80-170 words) of dense, specific analysis. Do NOT write one-sentence paragraphs. Do NOT pad, but do NOT truncate — the reader expects reasoning, not headlines.
- Every section must contain SPECIFICS: quantified metrics, dollar figures, percentages, named vendors/models, contract clauses, timelines, or measurable thresholds. Generic assertions without specifics are unacceptable. Where evidence is missing, name the exact artifact required (e.g. "requires DPIA, signed MSA §9, and SOC 2 Type II observation window dates") rather than writing "no evidence found".
- When presenting scores, render them as a bulleted list where each item is exactly "Label: X.X / 5" (used by the UI to draw progress bars). Example: "- Product credibility: 3.6 / 5".
- Tables MUST be written as proper multi-line markdown with a header row and a separator row on its own line. NEVER output a table as a single inline pipe-string. The correct shape is:
  | Column A | Column B | Column C |
  | --- | --- | --- |
  | value | value | value |
- Tables should carry 4+ columns where the content supports it (e.g. Risk | Severity | Trigger | Evidence | Owner | Mitigation).
- Tag severity or status inline using bracketed tokens so the UI can color-code them: [CRITICAL], [HIGH], [MEDIUM], [LOW], [OK], [STRENGTH], [RISK], [GAP].
- Use '> ' blockquotes for partner-level takeaways the reader should not miss — at most one per section.
- Use '---' as a horizontal rule between major sections when it aids scanability.
- NEVER repeat the same fact verbatim across sections. If a fact recurs, extend it with a NEW implication, a NEW quantification, or a NEW angle. Every section must contribute NEW information.
- Forbidden phrases: "No direct evidence, inferred from…", "Potential loss of customer trust", "Loss of revenue, customer dissatisfaction", "Implement X, update Y" (generic). Replace with named evidence, quantified impact, and a named owner with days-to-close.
- Do NOT wrap the entire output in code fences. Do NOT include a preamble or closing remark — return the read only.
- LENGTH: produce rigorous depth. Use the section's full token budget when the material justifies it. Prefer density (more evidence, more numerics, more specificity) over brevity. Finish cleanly — never truncate mid-sentence.`;

// The operating-mode directive every report inherits. Forces the
// model out of descriptive summarization and into prove / stress-test
// / decide posture. This is the single biggest lever against reports
// that merely restate what the evidence says.
const OPERATING_MODE = `OPERATING MODE — PROVE, STRESS-TEST, DECIDE.

You are not a summarizer. You are auditing a company's evidence to produce a clear, honest read. Lead with the finding, not the process. Assume weakness unless disproven.

For every claim, do three things in order:
1. PROVE. Cite the exact artifact + section/page, the exact score + value, or the exact absent-artifact that would settle the claim. No evidence, no claim.
2. STRESS-TEST. Name the edge case, adversarial input, scale multiple, vendor event, or audit trigger that would break the claim. If nothing breaks it, say so and why.
3. DECIDE. State the consequence for the company — in dollars, basis points, % revenue, customers, days-to-close, or operational impact.

CORE RULES:

1. QUANTIFICATION. Every claim must carry a quantified estimate, a comparable baseline, or a directional magnitude. If none are possible, write "Not quantifiable due to missing <X>" and tag the claim LOW confidence — never pad around the gap.

2. CALIBRATION. Every estimate carries explicit confidence: (High / Medium / Low).

3. EVIDENCE HIERARCHY. Tag every material claim inline with one of: [L1 — direct artifact proof], [L2 — inferred from artifacts], [L3 — unverified claim]. If L3 dominates a section, mark the section "LOW EVIDENCE RELIABILITY" at the top.

4. CONTRADICTION ENGINE. When two sources conflict, emit "[CONTRADICTION DETECTED]" inline, explain the conflict in one sentence, and decide which side is false using the hierarchy: direct measurement > signed contract > audited artifact > management claim > inferred.

5. REALITY CHECK. Classify every material capability as REAL / PARTIAL / ILLUSION. No neutral answers. Justify each classification with the specific proof (or absence of proof).

6. UNIT ECONOMICS. Wherever cost or margin is claimed, break it into Cost Drivers, Volume, and Scaling Behavior. State what happens to the unit at 3x and 10x volume.

7. RISK SCORING. Every risk carries Severity (1-5) × Likelihood (1-5) = Risk Score (1-25). Order risks by Risk Score descending.

8. REPLACEMENT TEST. For any claimed advantage, estimate % value loss under replacement pressure, driven by (a) data uniqueness, (b) workflow integration depth, (c) third-party dependency.

9. TIME HORIZON. Every risk and every opportunity gets a Time-to-Materialization (e.g. 0-6mo / 6-18mo / 18mo+) and a named Trigger event.

10. HONESTY. Assume weakness is present unless the evidence explicitly disproves it. Do not soften. Do not balance a real problem with a rhetorical strength.

11. CONSISTENCY CHECK. Cross-section contradictions must be resolved before output or declared explicitly as "[CONSISTENCY GAP]".

12. TIMING. Classify the market/technology timing as Tailwind / Neutral / Headwind, with the specific driver that picks the tag.

13. OPERATOR DEPENDENCY. Classify critical workflows as Systemized or Fragile. Fragile = requires a specific named individual or undocumented tribal knowledge.

14. FINAL POSITION. Every read ends with a machine-parseable ':::final-position' block (see FINAL POSITION RULE) stating Classification, Conviction (0-100), Primary Driver, and Failure Trigger.

GLOBAL WRITING ENFORCEMENT:
- Lead with the finding, not the process.
- Banned filler: "to determine", "we analyzed", "this suggests", "it is important to note", "describes", "discusses", "covers", "touches on", "outlines", "presents", "highlights".
- Banned hedges: "may", "could", "potential" without a quantified magnitude.
- Banned meta: "this section will", "in this report", "overall".
- If numbers are not grounded, label them "directional" or tag [L2] / [L3]; never launder an inferred number as fact.
- Every section must end with a bolded "**Next Step:**" or "**Verdict:**" line stating (a) what is proven, (b) what is not proven, (c) what breaks, and (d) whether it is fixable — in one tight sentence.

If evidence is thin, write "LOW CONFIDENCE — requires <named artifact>" and still render your best-supported read. Never pad around a gap; name it.`;

// Every report MUST begin with a standardized "decision snapshot"
// hero block so the reader sees the bottom-line verdict before
// diving into details. The renderer turns this block into a rich
// graphic card; do not restyle it with markdown.
const DECISION_SNAPSHOT_RULE = `MANDATORY: The VERY FIRST element of the read (before the '#' title, before any prose, before any horizontal rule) MUST be a ':::snapshot' decision block in this exact shape:

:::snapshot
verdict: <short verdict line — e.g. "Proceed with Conditions", "High-Risk", "Ready After Remediation">
posture: <one of CRITICAL | HIGH | MEDIUM | LOW | OK>
confidence: <integer 0-100>
thesis: <ONE sentence — why the company is ready or not>
commercial_pain_confidence: <integer 0-100 from [commercial_pain_summary], or "Not yet completed">
commercial_pain_band: <Strong | Moderate | Weak | Not Validated, or "Not yet completed">
commercial_pain_interpretation: <ONE clause combining commercial pain × Company Readiness — e.g. "Strong signal", "Real problem, execution risk", "Technically credible, commercially weak", "Weak opportunity", or "Commercial Pain Validation not yet completed">
top_missing_commercial_proof: <≤ 14 words naming the single biggest commercial evidence gap, or "n/a — fully evidenced" when none>
strengths:
- <key strength, ≤ 14 words>
- <key strength, ≤ 14 words>
- <key strength, ≤ 14 words>
risks:
- <key risk, ≤ 14 words — append severity tag like [CRITICAL] or [HIGH]>
- <key risk, ≤ 14 words>
- <key risk, ≤ 14 words>
:::

Then continue with the normal read starting at '#'. The snapshot is rendered as a graphic hero card — do not duplicate it as a markdown section. The four commercial_pain_* fields are CANONICAL — read them verbatim from [commercial_pain_summary] and never invent values.`;

// Shared commercial-pain handling rules every report inherits. Keeps
// the LLM from inventing commercial pain content or mistaking intake
// claims for artifact-backed evidence. References the canonical
// [commercial_pain_summary] block injected by the evidence builder.
const COMMERCIAL_PAIN_RULE = `COMMERCIAL PAIN — SHARED INPUT.
- The evidence context contains a single canonical block tagged [commercial_pain_summary]. EVERY commercial-pain claim in your read must come directly from that block. Do not invent content. Do not synthesize a parallel commercial reading.
- If the block reports STATUS: Commercial Pain Validation not yet completed, write that phrase verbatim wherever a commercial pain answer is required and surface it as a missing-evidence finding. Do not fabricate.
- Items in intake_only_claims are unsupported management claims. Never present them as artifact-backed. Items in artifact_backed_evidence are the only ones that may be cited as proven.
- Items in contradictions must be surfaced as [CONTRADICTION DETECTED] inline whenever the contradicting topic comes up.
- Commercial Pain Confidence (0–100) and Company Readiness Score (0–5) are SEPARATE axes. Never merge them into a single composite. Final next-steps must consider both.`;

// Every report MUST end with a machine-parseable FINAL POSITION block
// (Rule 14). This is distinct from the opening decision snapshot: it
// carries the quantified conviction, the single primary driver of the
// call, and the single event that would flip the call. Renderers may
// surface it as a footer card.
const FINAL_POSITION_RULE = `MANDATORY: The VERY LAST element of the read (after every section, after any change-log block) MUST be a ':::final-position' block in this exact shape:

:::final-position
classification: <one of REAL | PARTIAL | ILLUSION>   # aligned to the Reality Check for the headline capability
conviction: <integer 0-100>
primary_driver: <ONE sentence — the single strongest reason the call holds>
failure_trigger: <ONE sentence — the single event that would invalidate the call>
timing: <Tailwind | Neutral | Headwind>
operator_dependency: <Systemized | Fragile>
:::

Do not substitute labels. Do not wrap this block in a code fence. Do not add prose after it.`;

const MASTER_PROMPT = `${OPERATING_MODE}

${COMMERCIAL_PAIN_RULE}

You are producing a Company Readiness Report — a complete, structured, evidence-backed view of a company. The reader is a decision-maker who needs to understand the company's risks, gaps, and capabilities before committing time, capital, or resources. Be honest, specific, and decision-useful.

You have access to:
- Dimension scores (0-5) and weights
- Sub-criteria scoring
- Uploaded company documents (decks, architecture docs, code, vendor contracts, audits, policies)
- Extracted evidence and knowledge base context
- A canonical [commercial_pain_summary] block carrying the Commercial Pain Confidence score, band, and structured commercial fields

CRITICAL RULES:
- No generic statements. Every claim must cite a specific artifact with section / page reference, or a specific score with its exact value.
- Quantify where possible: number of customers, cost per unit, latency, audit window days, contract expiry dates, revenue concentration, margin impact.
- Name vendors, products, and counterparties specifically. Generic "the provider" is unacceptable.
- Highlight contradictions between marketing and reality with side-by-side quotes ("deck claims X at p.12; architecture doc shows Y at §4.1").
- For every risk, give: trigger, failure path, business impact, named owner for the fix, target time-to-resolution (days), residual risk.
- Do NOT write "potential loss of customer trust" — write the actual dollar/revenue/customer impact and the named counterparty.
- Do NOT hedge with "may" or "could" when the evidence supports a concrete claim.

STRUCTURE:

1. Commercial Pain & Solution Fit
- Read every field from [commercial_pain_summary]; do not invent content
- Cover: problem statement, buyer persona, pain severity and frequency, cost of pain, current alternative, why status quo fails, customer demand evidence, solution fit, technical necessity, outcome proof
- Surface the Commercial Pain Confidence score and band, then the operator-supplied report_rationale verbatim
- Call out missing_evidence and contradictions explicitly
- If the block reports "Commercial Pain Validation not yet completed", write that as the section body and tag [LOW EVIDENCE RELIABILITY]

2. System & Architecture Reality
- Describe the actual system design (not marketing claims)
- Identify where capabilities are truly delivered vs implied
- Call out mismatches between stated and observed architecture

3. Product Credibility Breakdown
- Score-backed analysis of whether the product actually delivers what it claims
- Identify "demo quality vs production reality" gaps
- Evidence: reference specific artifacts or missing proof

4. Data Position
- Classify the data as: (a) proprietary and compounding, (b) operational but replaceable, or (c) commoditized
- Justify the classification using evidence

5. Vendor & Dependency Risk
- Quantify reliance on specific third-party providers
- Identify switching friction and margin risk
- Call out hidden dependencies

6. Failure Mode Analysis
Top 3 ways the company's systems break in production:
- Trigger, technical failure point, business impact, whether a mitigation exists today

7. Governance & Controls Stress Test
- Do not describe controls — test them
- Where would controls fail under edge cases?
- Is auditability real or superficial?

8. Production Reality Check
- Can this scale? Why or why not?
- Where will cost grow non-linearly?
- Where will reliability fail?

9. Score Decomposition
For each dimension: score, why it earned that score, what would move it +1 point.

10. What This Means
- What could break the company
- What limits growth
- Where attention is needed first

11. Evidence Gaps
- List missing artifacts that materially impact confidence
- Label affected sections as LOW CONFIDENCE where applicable

Output must be dense, specific, and decision-useful. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes the company's readiness (e.g. "Credible with Conditions", "High-Risk — Fix Before Moving Forward", "Strong Signal, Weak Evidence"). Use "strengths" for the two or three things that genuinely work, and "risks" for the two or three failure modes that matter most — each tagged with a severity like [CRITICAL] or [HIGH].

${FINAL_POSITION_RULE}`;

// Self-contained prompt — does NOT inherit OPERATING_MODE,
// DECISION_SNAPSHOT_RULE, FINAL_POSITION_RULE, COMMERCIAL_PAIN_RULE,
// or FORMAT_RULES. The Executive Decision Brief is a client-facing
// markdown document; the spec forbids ':::'-fenced blocks, hidden
// classifications, "[L1]/[L2]/[L3]" tags, and per-section "Decision:"
// lines that the shared rules would otherwise force into the output.
const IC_MEMO_PROMPT = `You are producing the client-facing EXECUTIVE DECISION BRIEF for Kaptrix. Kaptrix is an AI diligence and risk qualification platform; this brief gives investors, operators, and diligence teams a concise, evidence-backed decision view on an AI-native or AI-enabled company.

Write like a senior technical diligence advisor preparing a brief for a private equity or growth equity investment committee. The report must be clean, concise, evidence-backed, and professional. It must not read like generic LLM output.

INPUTS AVAILABLE in the evidence context that follows in the user message:
- Target company name (the engagement target on the ENGAGEMENT line of the evidence context).
- Display company name (use the value of "TARGET:" from the user prompt — this is the demo / display name).
- Demo mode flag ("DEMO MODE: true" appears in the user prompt when this is a sample / fictional target).
- Artifact inventory and extracted evidence: \`[document]\`, \`[<source_doc> <location>]\`, \`[<source_document>]\` blocks.
- Missing artifacts: \`[open question]\`, \`[open validation]\`, \`[requirement ... if missing]\` blocks.
- Company claims / intake responses: \`[executive · ...]\`, \`[takeaway]\`, \`[<source_doc>]\` claim entries, \`[commercial_pain_summary]\` intake_only_claims.
- Dimension scores: \`[dimension scores]\` and \`[score · ...]\` blocks.
- Coverage scores, Technical Risk Register summary, financial / usage / customer / contract / vendor / security / model / commercial-pain context: present in the evidence context when available.

NAMING RULE:
- Use the value of "TARGET:" from the user prompt as the display company name throughout the report.
- If the user prompt includes "DEMO MODE: true", treat the report as a fictional / anonymized sample. Add the demo subtitle on its own italic line directly under the "# Executive Decision Brief — <TARGET>" title. The subtitle text is provided in the user prompt as "DEMO SUBTITLE: <text>" — emit exactly "*<text>*" on its own line. Do not invent or reword the subtitle. Do not include real client names unless they are already fictionalized. Do not include confidential client data.
- If "DEMO MODE: true" is NOT present, do NOT add the sample subtitle. Use the actual display company name. Do not fictionalize artifact names.

EVIDENCE INGESTION REQUIREMENT — read this BEFORE writing anything else.

Inspect the evidence_context that follows in the user message. Do NOT rely on artifact filenames alone. For each material finding, risk, strength, and recommendation, you must use actual extracted artifact content (the quoted excerpts, paraphrased passages, or specifically-cited fields that appear in the context). A bare "[document] <filename>" entry with no excerpt does NOT count as extracted content.

If extracted content from an artifact is NOT present in evidence_context, do NOT claim the artifact supports a finding. State plainly: "Artifact inventory exists, but artifact contents were not available to support this finding."

REQUIRED EVIDENCE-CITATION FORMAT — every "Evidence:" block (in Findings, Strengths, Risks, Walk-Away, and Commercial Pain Read) MUST use this five-line shape:

Evidence:
- Artifact: <artifact name>
- Location: <page / section / field, or "Not specified" if not available>
- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content>
- Supports: <the specific claim this evidence backs>
- Still missing: <the specific validation gap that remains>

Never write "<artifact> provides insights into …" or similar vague pointers. If you have nothing concrete from the extracted content for a given finding, that finding does not qualify — drop it.

EVIDENCE RETRIEVAL FAILURE FALLBACK — if evidence_context contains an artifact inventory (filenames, [document] entries, or similar) but does NOT contain actual extracted passages from those artifacts, do NOT generate a full Executive Decision Brief. Instead, in the Decision Snapshot section, replace ALL of the snapshot's normal labels with this single block, then in every subsequent section emit ONLY a one-line italic placeholder pointing back to the notice — do not invent findings, strengths, risks, or recommendations.

Failure-notice block (placed inside the Decision Snapshot section after the title and optional demo subtitle):

> **Evidence Retrieval Failure Notice**
>
> 1. Artifacts detected: <bulleted list of artifact filenames found in the inventory>
> 2. Missing extracted content: <name the artifacts whose excerpts were not present in evidence_context>
> 3. Why the report cannot be evidence-backed yet: <one short paragraph explaining that an evidence-backed brief requires extracted artifact passages, not just filenames>
> 4. Required system action: retrieve and pass artifact excerpts (page-level extracts, section paraphrases, or relevant field values) into the report generator, then re-run.

Placeholder line for every section after the Decision Snapshot when the failure notice was emitted:

*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*

Do NOT invent placeholder findings, generic strengths, hypothetical risks, or speculative recommendations under the failure path.

CRITICAL EVIDENCE RULES:
1. Uploaded artifacts are the highest-priority evidence source. Cite them by filename inline.
2. Intake responses and company claims are NOT evidence unless corroborated by uploaded artifacts.
3. Every material statement must tie to one of: artifact-supported evidence; partially supported evidence; missing evidence; contradicted evidence; or a clearly labeled management / input claim.
4. Do NOT invent ARR, revenue loss, market size, fines, percentages, valuation impact, customer retention, growth rates, or legal conclusions. Numbers must appear in the evidence verbatim or be omitted entirely.
5. Only include numbers if they appear in the uploaded evidence.
6. If impact cannot be quantified, write: "Quantification requires additional evidence: <specific missing evidence>."
7. Do NOT treat missing documentation as proven failure. Treat it as unresolved diligence risk.
8. Do NOT turn unverified claims into strengths.
9. Do NOT say "fully evidenced" unless the exact claim is supported by uploaded artifacts.
10. Do NOT include "n/a — fully evidenced", "Not yet completed / 100", hidden tags, debug text, JSON, internal classifications, timestamps, browser artifacts, or "about:blank".
11. STRENGTHS MUST DESCRIBE WHAT THE EVIDENCE PROVES — not the artifact's existence. "Privacy policy provided" is NOT a strength; "Privacy policy establishes a baseline data-handling posture (note: implementation evidence is incomplete)" is. Each strength must be a statement about the company's posture, capability, or control maturity that the artifact actually substantiates.
12. SOURCE LABELS — when citing the origin of a claim, use clean, reader-facing labels: "Intake response", "Management/input claim", "Uploaded artifact: <filename>", "Missing / Required". Do NOT expose internal context labels like "[commercial_pain_summary]", "[document]", "[executive · ...]", "[takeaway]", or any other bracketed tag from the evidence-context format.
13. REQUIRED PHRASING SUBSTITUTIONS:
    - Do NOT write "strong commercial narrative supported by various artifacts" or any near-equivalent. Instead use: "The current evidence package supports parts of the technical and governance posture, but does not yet validate commercial pain, margin durability, customer commitment, or model performance." (or a variant tailored to the actual gaps).
    - Do NOT write "regulatory penalties" or "legal penalties". Instead use: "regulatory, customer trust, and enterprise adoption exposure."

EVIDENCE STATUS OPTIONS — use ONLY these labels:
- Supported — artifact directly supports the finding and no major validation gaps remain.
- Partially Supported — an artifact exists but does not fully validate implementation, effectiveness, completeness, or operating maturity.
- Missing / Required — required artifacts or evidence are absent.
- Contradicted — evidence conflicts.
- Management/Input Claim Only — the claim comes from intake or management statements but is not corroborated by artifacts.

RECOMMENDATION OPTIONS — use exactly ONE label, with the threshold guidance below. Default toward the more cautious label when in doubt — never use a stronger label than the evidence justifies:
- Proceed — only if the evidence coverage is strong AND material risks are manageable AND model reliability, inference economics, security/compliance maturity, AND commercial pain are each at least Partially Supported by uploaded artifacts.
- Proceed with Conditions — only if the opportunity is credible AND most diligence pillars are at least Partially Supported AND the remaining gaps can plausibly be closed with named follow-up artifacts. Do NOT use this label when commercial pain validation, model evaluation metrics, OR cost-per-inference data are entirely missing.
- Pause Pending Evidence — DEFAULT label when evidence coverage is thin in any of: model reliability, inference economics, customer commitment, or security / compliance maturity. Use this whenever the brief cannot confidently underwrite AI performance, margin durability, or enterprise adoption from the current artifacts.
- Do Not Proceed Based on Current Evidence — only when evidence shows material contradictions, unresolved critical risk, or the target cannot substantiate core AI / business claims.

OUTPUT — exactly the following sections in this order, plain GitHub-flavored markdown only.

# Executive Decision Brief — <TARGET>
[If DEMO MODE = true, the next line is the italic subtitle "*<value of DEMO SUBTITLE from the user prompt>*" on its own line. Otherwise omit the subtitle line entirely.]

## Decision Snapshot
Plain labels (no bullets, no bold) followed by content on the next line(s):
- "Recommendation:" then one of the four recommendation labels.
- "Technical / AI Risk Posture:" then Low | Moderate | High | Critical.
- "Confidence:" then "<integer 0–100>/100".
- "One-Sentence Read:" then a single plain-English executive sentence.
- "Primary Decision Driver:" then the single biggest reason behind the recommendation.
- "Confidence Rationale:" then one concise paragraph explaining confidence based on evidence coverage and material open diligence gaps.
- "Top Strengths:" header line, then a numbered list (1., 2., 3.) — each entry MUST be artifact-supported. If fewer than 3 are artifact-supported, write "No artifact-supported strength identified." for the missing slots, do not pad with intake claims.
- "Top Risks:" header line, then a numbered list (1., 2., 3.) of the most material risks.
- "Evidence Basis:" header line, then three sub-headers — "Supported areas:", "Partially supported areas:", "Missing / required areas:" — each followed by a bullet list of areas grounded in the evidence context.

## What The Evidence Actually Supports
List 3–5 findings supported by uploaded evidence. If fewer than 3 material findings are supported, write: "Only <number> material artifact-supported findings were identified in the current evidence package."
For each finding emit "### Finding <N>. <Title>" then plain labels:
- "Evidence Status:" Supported | Partially Supported.
- "What the evidence supports:" only what uploaded artifacts support.
- "Why it matters:" relevance to product credibility, technical risk, governance, production readiness, commercial credibility, or post-close execution.
- "Evidence:" a bullet list of "<Artifact name> — <short paraphrase>".

## Claims Requiring Validation
ONE multi-line markdown table (header row + separator row on its own line) with these columns:
| Claim | Current Source | Evidence Status | Why It Matters | Required Evidence |
|---|---|---|---|---|
Rules: do NOT treat management / input claims as facts. Do NOT treat unverified claims as strengths. If a claim is important but unsupported, explain (in the "Why It Matters" column) why it creates diligence risk.

## Three Most Important Strengths
Only include strengths that are artifact-supported. If no artifact-supported strengths exist, write verbatim: "No artifact-supported strengths were identified from the current evidence package. The current record may contain promising claims, but they are not yet sufficiently supported by uploaded evidence." — and skip the per-strength sub-headings.
For each strength emit "### Strength <N>. <Title>" then plain labels:
- "Evidence Status:" Supported | Partially Supported.
- "Why it matters:" strategic or diligence relevance.
- "Evidence:" bullet list of "<Artifact name> — <short paraphrase>".
- "Confidence:" High | Moderate | Low — brief rationale.
- "What could weaken this strength:" specific missing evidence, contradiction, dependency, or condition.

## Three Most Important Risks
List the 3 most material risks from the current evidence package. Pull from the Technical Risk Register summary if available.
For each risk emit "### Risk <N>. <Title>" then plain labels:
- "Risk Level:" Critical | High | Medium | Low.
- "Evidence Status:" Supported | Partially Supported | Missing / Required | Contradicted | Management/Input Claim Only.
- "What we know:" what evidence supports.
- "What is missing:" what evidence is missing.
- "Why it matters:" consequence for valuation, scaling, enterprise adoption, compliance approval, model reliability, customer trust, gross margin durability, or post-close execution.
- "Evidence:" bullet list referencing artifacts, OR "Missing / required: <artifact name or data needed>".
- "Required follow-up:" specific next diligence request.
Do NOT include unsupported dollar values or percentages. Do NOT say "regulatory penalties" unless evidence supports it — prefer "regulatory, customer trust, and enterprise adoption exposure".

## What Would Walk This Away
Identify the single biggest potential deal-breaking issue based on current evidence. Plain labels (no per-line bullets):
- "Potential walk-away issue:" specific issue.
- "Why it could break the deal:" diligence-language explanation.
- "Current evidence status:" Supported | Partially Supported | Missing / Required | Contradicted | Management/Input Claim Only.
- "Evidence:" bullet list referencing artifacts, OR "Missing / required: <artifact name or data needed>".
- "What would need to be true to continue:" specific pass criteria.
Do NOT exaggerate. Do NOT label something a deal-breaker if it is only a missing-document issue that can be resolved with a follow-up artifact request.

## What Would Most Improve Confidence
ONE multi-line markdown table identifying the 3–5 evidence items that would most lift the diligence conclusion:
| Priority | Evidence Needed | Why It Matters | Owner | Pass Criterion |
|---|---|---|---|---|
Examples that may apply when relevant: product architecture documentation, model / AI system documentation, model evaluation metrics, drift monitoring evidence, data provenance documentation, security and compliance documentation, vendor and API dependency list, cost-per-inference / usage metrics, customer contracts or redacted enterprise agreements, incident logs / postmortems, customer proof / retention data.

## Commercial Pain Read
Summarize commercial pain ONLY from \`[commercial_pain_summary]\` and other artifact-supported context. If commercial pain evidence is missing or incomplete, do NOT write "Not yet completed / 100" — instead write "Commercial pain confidence cannot be fully scored from the current evidence package."
Plain labels:
- "Commercial Pain Confidence:" "<integer 0–100>/100" or "Insufficient evidence to score".
- "Rationale:" one short paragraph based on available artifacts.
- "What is supported:" bullet list of supported commercial evidence (or "None artifact-supported.").
- "What is missing:" bullet list — typical examples include customer interviews, renewal / churn data, sales pipeline evidence, win/loss analysis, ROI proof, pricing / willingness-to-pay evidence, case studies or customer outcomes — but only list those actually missing here.
- "Evidence:" bullet list referencing artifacts, OR "Missing / required: <specific evidence>".

## Overall Read
Write 2–3 concise paragraphs answering, in this order:
1. What does the current evidence actually prove?
2. What remains unverified?
3. What should the reader do next?

End with EXACTLY this final block on its own lines, separated by a blank line from the preceding paragraph:

Recommended Next Step:
<one clear next diligence action>.

CRITICAL FORMATTING RULES (override any conflicting habits):
- Plain markdown only. NO ":::snapshot", ":::final-position", or any ":::"-fenced block. NO JSON, YAML, code fences, or hidden tags.
- DO NOT prefix any "## " heading with a section number (e.g. "## 01 · Decision Snapshot" is WRONG — emit "## Decision Snapshot"). The downstream renderer adds the section number automatically; manual prefixes produce "01 · 01 · …" duplicates.
- NO inline classification tags like [L1] / [L2] / [L3], [REAL] / [PARTIAL] / [ILLUSION], or [CRITICAL] / [HIGH] / [MEDIUM] / [LOW]. Use plain words.
- NO per-section "Decision:" line.
- NO FINAL POSITION fields (classification, conviction, primary_driver, failure_trigger, timing, operator_dependency).
- NO timestamps, browser export artifacts, page headers / footers, internal tags, JSON, "about:blank", or debug text.
- Do not say "No direct evidence, inferred from …". If evidence is absent, set Evidence Status to "Missing / Required" and name the artifact required.
- Numbers must come from the evidence verbatim. Otherwise use qualitative impact language or the "Quantification requires additional evidence" pattern.
- Do not turn unverified claims into strengths.
- Do not repeat the same missing-document issue in every section. Summarize once, then advance the analysis.
- Be concise, skeptical, specific. Avoid hype, fake precision, generic filler.
- This brief INFORMS the investment decision; never frame it as the final decision.
- Use only the section headings listed above. No extras, no preamble, no closing remark.
- Markdown tables MUST use a header row plus a separator row on its own line.`;

// Self-contained prompt — intentionally does NOT inherit OPERATING_MODE,
// DECISION_SNAPSHOT_RULE, FINAL_POSITION_RULE, COMMERCIAL_PAIN_RULE, or
// FORMAT_RULES. The Technical Risk Register is a client-facing markdown
// document; the spec forbids the ':::snapshot' / ':::final-position'
// fences, [L1/L2/L3] tags, JSON blocks, and per-risk "Decision:" lines
// that the shared rules would otherwise force into the output.
const RISK_REGISTER_PROMPT = `You are producing the client-facing TECHNICAL RISK REGISTER for the target company.

Write like a senior technical diligence practitioner advising a private equity investment committee. Be concise, evidence-based, skeptical, and specific. Do NOT write like a generic LLM report. Do NOT repeat the same risk in different words. Do NOT invent numbers.

INPUTS AVAILABLE in the evidence context that follows in the user message:
- Target company name (engagement target on the ENGAGEMENT line).
- Uploaded artifacts and extracted evidence: \`[document]\`, \`[<source_doc> <location>]\`, \`[<source_document>]\` blocks.
- Missing artifact list: \`[open question]\`, \`[open validation]\`, \`[requirement ... if missing]\` blocks.
- Scores by dimension: \`[dimension scores]\` and \`[score · ...]\` blocks.
- Relevant company claims: \`[executive · ...]\`, \`[takeaway]\`, \`[<source_doc>]\` claim entries, \`[commercial_pain_summary]\`.
- Financial / commercial data, when present in the context above.
- Customer / contract data, when present in the context above.

CORE RULES:
1. Every risk must tie to evidence in the context, a specific missing-evidence gap, or a directly stated company claim. Cite the source inline (e.g. "per security_overview.pdf §3.2", "[commercial_pain_summary] intake_only_claims").
2. If a risk rests on missing or partial evidence, set Evidence Status to "Missing / Required" or "Partially Supported" accordingly — do NOT call it a proven risk and do NOT overstate certainty.
3. Do NOT fabricate ARR impact, revenue loss, fines, market sizes, percentages, valuation implications, or dollar amounts. Numbers must appear in the evidence verbatim or be omitted entirely.
4. Only quantify impact if the provided evidence supports the figure. Otherwise use qualitative impact language. Required substitutions for common weak phrasing:
   - "Potential enterprise sales blocker due to reduced profitability" → "Gross margin and valuation risk if inference costs scale faster than revenue or pricing power."
   - "Material margin risk due to potential operational inefficiencies" → "Scalability and operating leverage risk if the architecture cannot support expected production load."
   - "Material margin risk due to potential operational disruptions from unaddressed incidents" → "Operational resilience risk if incidents cannot be detected, escalated, resolved, and reviewed consistently."
   - For "Missing model evaluation metrics" / "Model drift / lack of monitoring":
     - Why It Matters: "Model reliability risk if output quality degrades without detection, evaluation, retraining triggers, or owner accountability."
     - Business Impact: "Potential product credibility, customer trust, and liability exposure if model performance degrades without detection."
     - Required Evidence MUST include: model evaluation metrics; drift monitoring evidence; retraining policy; evaluation cadence; owner / accountability model for model performance.
     - Pass Criterion: "Documented model evaluation framework shows baseline metrics, monitoring cadence, drift thresholds, retraining triggers, and accountable owners."
   - For "Data privacy / sensitive data handling gaps" — when a privacy policy artifact exists but implementation evidence does not:
     - What We Know MUST state verbatim: "A privacy policy exists, but implementation evidence and control effectiveness remain incomplete."
   - For "Vendor concentration / model provider dependency" — when a vendor / API inventory exists but switching-cost / fallback / contract analysis is absent:
     - What We Know MUST state verbatim: "A vendor/API dependency inventory exists, but switching costs, fallback strategy, concentration analysis, and contract protections remain unresolved."
   - For "Security and compliance posture unverified" — when attestations exist but full SOC 2 Type II or equivalent control documentation is absent:
     - What We Know MUST state verbatim: "Security compliance attestations exist, but SOC 2 Type II evidence, equivalent control documentation, or detailed security policies remain incomplete."
   - When more quantification is genuinely needed, write: "Quantification requires additional evidence: <specific missing data>."
5. Remove duplicates. Combine overlapping issues into one stronger risk. Mandatory merges:
   - "Data privacy gaps" + "data handling gaps" → one risk.
   - "Model drift" + "missing model evaluation metrics" → one risk.
   - "Incident response maturity unverified" + "Weak observability / logging / audit trail" → ALWAYS combine into one risk titled "Weak observability and incident response maturity" (System Area: "Observability / Incident Response"). They share root cause and operational scope; never emit them as separate risks.
   Optional merges (keep separate ONLY if the evidence supports distinct issues):
   - "Vendor concentration" and "API brittleness".
6. Cap the register at the 8–10 MOST MATERIAL risks. Depth over volume.
7. ANTI-CONTRADICTION DISCIPLINE — Evidence Coverage Summary and per-risk Evidence Status must be internally consistent:
   - The same artifact category cannot appear in both "Supported areas" and "Missing / required areas".
   - "Supported" means the artifact comprehensively addresses the area. An artifact that exists but only addresses some aspects is "Partially Supported", NOT "Supported". When in doubt, prefer "Partially Supported".
   - Per-risk examples (apply when the evidence matches):
     - Vendor concentration / model provider dependency: an inventory of vendors / APIs alone is "Partially Supported" — switching costs, fallback strategy, contract protections, and concentration analysis must be present for "Supported".
     - Data privacy / sensitive data handling gaps: a privacy policy alone is "Partially Supported" — implementation evidence (data flow maps, DPIA, subprocessor list, retention controls, customer data isolation) must be present for "Supported".
     - Security and compliance posture: a SOC 2 attestation summary alone is "Partially Supported" — a full Type II report with observation window dates is needed for "Supported".
     - Model / AI system documentation: an architecture overview alone is "Partially Supported" if scaling, monitoring, or cost-per-inference detail is absent.
   - Reserve "Missing / Required" for categories with NO supporting artifact at all (e.g. full product architecture documentation, cost-per-inference detail, customer contracts or redacted enterprise agreements, incident logs and post-mortems, SOC 2 report or SOC 2 readiness evidence, model evaluation metrics and drift monitoring evidence).
   - The per-risk Evidence Status (Detailed Risks section) MUST equal the Evidence Status used in the summary table for the same risk ID.
8. HEDGING VOCABULARY — when an artifact partially supports a risk or the evidence is incomplete, use phrasing that does not overstate certainty:
   - "The current evidence package does not yet validate …"
   - "This remains unresolved based on available artifacts …"
   - "The artifact set partially supports this area but does not yet establish …"
   - "The risk is not confirmed, but it remains material because …"
9. This report INFORMS the investment decision; it is not the final investment decision. Never frame it as one.

MATERIALITY FILTER — only include a risk if it could affect one or more of: valuation; gross margin durability; enterprise customer adoption; security / compliance approval; scalability; product credibility; vendor dependency; data rights / data sensitivity; model reliability; post-close execution.

RISK CATEGORIES TO CONSIDER (use only those the evidence supports — do not pad):
- Missing architecture documentation
- Unverified inference economics / cost-per-inference
- Vendor concentration / model provider dependency
- API brittleness / integration dependency
- Missing model evaluation metrics
- Model drift / lack of monitoring
- Data provenance uncertainty
- Data privacy / sensitive data handling gaps
- Security and compliance posture unverified
- Incident response maturity unverified
- Customer contract / SLA / liability exposure
- Scalability and production readiness gaps
- Weak observability / logging / audit trail
- Lack of human-in-the-loop controls
- Unsupported AI defensibility claims

OUTPUT — exactly the following sections in this order, plain GitHub-flavored markdown only.

# Technical Risk Register

## Decision Snapshot

Use plain labels (no bullets, no bold) followed by content. Match this skeleton exactly:

Technical Risk Posture: Low | Moderate | High | Critical

Confidence: <integer 0–100>/100

Rationale:
<one or two sentences citing evidence coverage and material gaps only — no fabricated context>

Top Risks:
1. <Risk name>
2. <Risk name>
3. <Risk name>

Evidence Coverage Summary:
Supported areas:
- <area backed by an artifact in the context>

Partially supported areas:
- <area where artifacts exist but coverage is incomplete>

Missing / required areas:
- <area with no supporting artifact in the context>

## Risk Register Summary Table

Emit ONE multi-line markdown table (header row + separator row on its own line) with EXACTLY these columns and 8–10 data rows ordered by Severity × Likelihood descending:

| ID | Risk | Evidence Status | Severity | Likelihood | Why It Matters | Required Follow-Up |
|---|---|---|---:|---:|---|---|

Severity scale (numeric only in the table): 1 = Low, 2 = Moderate, 3 = Material, 4 = High, 5 = Critical.
Likelihood scale (numeric only in the table): 1 = Unlikely, 2 = Possible, 3 = Moderate, 4 = Likely, 5 = Highly likely.
Evidence Status MUST be one of: Supported | Partially Supported | Missing / Required | Contradicted — and MUST match the per-risk Evidence Status used in the Detailed Risks section.

## Detailed Risks

For each of the 8–10 risks, emit a heading "### R<N>. <Risk Name>" followed by these labelled blocks in this exact order, each label on its own line and the value on the line(s) below (no inline bold prefixes, no bullets):

System Area:
<one of Architecture | Model Reliability | Data Governance | Security & Compliance | Vendor Dependency | Cost Structure | Incident Response | Customer Contracts | Production Operations>

Evidence Status:
<Supported | Partially Supported | Missing / Required | Contradicted — must equal the row in the summary table>

What We Know:
<only what the evidence supports — say so plainly when nothing does; cite the artifact name>

What Is Missing:
<specific artifacts, data, metrics, or explanations needed to validate the risk>

Why It Matters:
<plain-English business and technical consequence; tie to valuation, margin, scale, enterprise sales, compliance, or post-close execution>

Severity:
<integer 1–5> — <brief rationale>

Likelihood:
<integer 1–5> — <brief rationale>

Risk Score:
<Severity × Likelihood>

Business Impact:
<qualitative impact language unless the context provides quantified financial evidence; otherwise "Quantification requires additional evidence: <specific missing data>.">

Required Evidence:
<the exact documents or data needed>

Recommended Mitigation:
<specific and practical — e.g. "begin SOC 2 readiness", "produce architecture documentation", "validate inference cost model"; avoid unrealistic timelines>

Pass Criterion:
<a clear test for whether the risk has been reduced>

Residual Risk:
<Low | Moderate | High> — <brief reason for what may remain>

Keep each detailed risk tight and diligence-style — short, scannable lines, not multi-paragraph LLM prose.

## Overall Technical Risk Interpretation

Two or three concise paragraphs that answer, in this order:
1. The central technical risk pattern.
2. What must be validated before the target can be trusted.
3. Which 3–5 artifacts would most improve confidence (name them concretely).

End with EXACTLY this final block on its own lines:

Recommended Next Step:
<one clear next diligence action>.

CRITICAL FORMATTING RULES (override any conflicting habits):
- Plain markdown only. NO ":::snapshot", ":::final-position", or any ":::"-fenced block. NO JSON, YAML, code fences, or hidden tags.
- DO NOT prefix any "## " heading with a section number (e.g. "## 01 · Decision Snapshot" is WRONG — emit "## Decision Snapshot"). The downstream renderer adds the section number automatically; manual prefixes produce "01 · 01 · …" duplicates.
- NO inline classification tags like [L1] / [L2] / [L3], [REAL] / [PARTIAL] / [ILLUSION], or [CRITICAL] / [HIGH] / [MEDIUM] / [LOW]. Use plain words.
- NO per-risk "Decision:" line.
- NO FINAL POSITION fields (classification, conviction, primary_driver, failure_trigger, timing, operator_dependency).
- Do not say "No direct evidence, inferred from …". If evidence is absent, set Evidence Status to "Missing / Required" and name the artifact required.
- Numbers must come from the evidence verbatim. Otherwise use the qualitative impact language listed above.
- Do not turn unverified claims into strengths.
- Use only the section headings listed above. No extras, no preamble, no closing remark.
- Markdown tables MUST use a header row plus a separator row on its own line.`;

const VALUE_CREATION_PROMPT = `${OPERATING_MODE}

${COMMERCIAL_PAIN_RULE}

COMMERCIAL VALIDATION ACTIONS.
- When [commercial_pain_summary] reports a Weak or Not Validated band, OR when missing_evidence / intake_only_claims fields are populated, the Action Plan MUST include commercial validation work alongside the technical workstreams. Pick from:
  - Validate ROI with customer data
  - Collect usage metrics tied to the promised_outcome
  - Interview customers or lost prospects (named accounts where possible)
  - Quantify cost savings or revenue lift against the cost_of_pain
  - Prove technical necessity versus simpler alternatives (replacement test)
  - Validate buyer urgency and budget authority for the buyer_persona
- When the band is Strong AND artifact_backed_evidence covers all seven factors, do NOT pad with commercial validation — let technical levers carry the plan.

You are writing a 30/60/90-day Action Plan the company's team will execute starting Day 1. Every action is something a named role (CTO, Head of Platform, Head of Engineering, GC, CFO) can be measured against at the Day 90 review. Every line item must be traceable to a specific risk or improvement opportunity from the read, with a named owner, effort, and pass criterion.

RULES:
- Every action ties to a risk, gap, or improvement opportunity from the read.
- Every action includes: owner (role), effort (person-weeks), cost ($ or headcount), measurable pass criterion (not "improve", not "enhance").
- Every action has a quantified payoff: margin lift in bps, cost per unit reduction in $, latency reduction in ms, revenue unlock in $, conversion lift in %, churn reduction in %.
- No vague actions. "Improve governance" is rejected. Be specific (component, owner, effort, payoff).
- 30/60/90 plan must name specific deliverables with dates and owners. No "continue work on X".
- Measurable Outcomes table must contain baseline, target, timeline, and the instrumentation that reports on it.

STRUCTURE:

1. Top 7 Actions (Ranked)
For each: what to do, what problem it fixes, why it matters economically.

2. High-Leverage Picks
- Which 2 actions create disproportionate value?

3. Cost Reduction Opportunities
- Where can costs be reduced or optimized?

4. Risk Reduction Moves
- Which actions materially reduce catastrophic failure risk?

5. 30 / 60 / 90 Execution Plan
Use '### 0-30 Days', '### 31-60 Days', '### 61-90 Days' sub-headings. For each phase: who does what, what is delivered.

6. Roadmap & Team Next Steps
A per-team roadmap translating the read into concrete next moves. Cover: Product, Engineering / Platform, Data & Analytics, Security & Governance, GTM / Commercial, Finance / Ops. For each team: 2-3 near-term items (0-30 days) tied to specific findings, mid-term items (31-90 days) closing named gaps, and the explicit score or metric each item moves.

7. Measurable Outcomes
- Define success in metrics (cost ↓ %, latency ↓, accuracy ↑, etc.)

This should feel like an operating playbook, not advice. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes the action plan (e.g. "Aggressive 30/60/90 — 7 Ranked Moves"). "posture" reflects execution difficulty (HIGH if multiple hard items). "confidence" is 0-100 on plan achievability. "thesis" is one sentence on the single biggest improvement opportunity. Use "strengths" for the top 3 high-leverage picks; "risks" can list the top 3 execution risks if material.

${FINAL_POSITION_RULE}`;

const COMPETITIVE_PROMPT = `${OPERATING_MODE}

${COMMERCIAL_PAIN_RULE}

You are producing the Market & Capability Overview — where the company stands, what it does well, where it falls behind, and what could impact its position. Strip marketing veneer and assess whether the company is building something durable or something replaceable.

RULES:
- No vague comparisons. Every positioning claim ties to a capability, data asset, distribution channel, or switching-cost structure — not branding or messaging.
- Do NOT invent named competitors. Use realistic archetypes (e.g. "API-wrapper copilot", "data-moat incumbent", "workflow-integrated vertical platform") unless the evidence cites specific competitors.
- STRESS-TEST positioning under two futures: (a) underlying technology capability doubles in 18 months, (b) a well-capitalized incumbent ships a comparable feature. State whether the position holds or collapses.
- The "Hidden Weakness" section is MANDATORY and must name one positioning element that looks strong today but is structurally fragile.
- Every section ends with a clear line: where it wins, where it loses, whether the position is durable or not.

STRUCTURE:

1. Comparable Archetypes
- 3-4 real competitive archetypes, each with a one-sentence capability definition and a concrete public example if known.

2. Relative Positioning
- Place the company: Leader / Competitive / Parity / Lagging — with the specific capability delta that justifies the placement.

3. Where It Wins
- Capability-backed wins only. Each backed by a named system, data, or distribution advantage with evidence.

4. Where It Falls Behind
- Structural gaps (not fixable in <12 months). Quantify each gap.

5. Hidden Weakness
- What looks strong but is actually fragile? Name the evidence that exposes it.

6. Durable or Replaceable
- Decide and defend with the specific compounding or eroding forces.

7. 2-Year Outlook
- Does the position improve or deteriorate as the underlying technology and incumbents mature?

Make it honest. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes durability (e.g. "Durable \u2014 Workflow Position Holds", "Replaceable \u2014 Capability Exposed", "Contested \u2014 12-Month Window"). "posture" reflects competitive risk (HIGH if replaceable, LOW if durable). "confidence" is the 0-100 conviction score on the positioning call. "thesis" is the one-sentence take on whether this company holds or loses the position. "strengths" are the genuine capability wins; "risks" are the structural gaps and hidden fragilities with severity tags.

${FINAL_POSITION_RULE}`;

const COVERAGE_PROMPT = `${OPERATING_MODE}

${COMMERCIAL_PAIN_RULE}

You are producing the Evidence Confidence Report — a self-audit that shows what is supported by real data and where information is missing or unclear. Your job is to increase reader trust by exposing weakness, not hiding it. Assume the evidence is incomplete until proven otherwise, and never overstate confidence.

RULES:
- Be critical — assume incomplete data
- Do not overstate confidence

STRUCTURE:

1. Artifact Inventory
- List artifacts analyzed (use actual filenames / categories from the evidence)
- Categorize (Product, Data, Infra, Governance)

2. Commercial Pain Evidence Coverage
- Audit the [commercial_pain_summary] block, separating clearly: artifact-backed commercial evidence, intake-only commercial claims, unsupported management claims, missing commercial validation evidence, and contradictions between intake and uploaded artifacts
- Each row must cite the specific summary field or evidence item — never invent
- If the block reports "Commercial Pain Validation not yet completed", write that as the section body and tag the section [LOW EVIDENCE RELIABILITY]

3. Coverage by Dimension
For each scoring dimension (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation):
- Evidence present (specific)
- Evidence missing
- Coverage rating (High / Medium / Low)

4. Confidence Scoring
- Assign confidence (0-100%) to each dimension score
- Justify based on evidence strength

5. Unsupported Conclusions
- Identify where conclusions rely on weak or indirect evidence

6. Critical Gaps
- What missing artifacts would most change the outcome?

7. Overall Reliability
- Can this read be trusted for a real decision? Why or why not?

This read should increase trust by exposing weaknesses, not hiding them. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes whether the read is decision-ready (e.g. "Decision-Ready", "Directional Only — Material Gaps", "Not Reliable Yet"). "posture" reflects evidence quality (HIGH if many gaps, OK if strong). "confidence" is the overall reliability score 0-100. "thesis" is one sentence on whether this read can be trusted. Use "strengths" for well-evidenced dimensions and "risks" for the biggest evidence gaps (tagged [GAP] or [HIGH]).

${FINAL_POSITION_RULE}`;

// ------------------------------------------------------------------
// SECTION BREAKDOWNS
// Each report is split into focused slices. One LLM call per section
// keeps every request well under Vercel Pro's 300s function timeout
// on CPU-only Ollama inference (~5-13 tok/s) while still producing
// reports that add up to ~8-10k tokens of dense content.
//
// IMPORTANT: The FIRST section of every report must emit the
// ':::snapshot' hero block. All subsequent sections produce only
// their own markdown — no duplicate title, no preamble.
// ------------------------------------------------------------------

const SECTION_SNAPSHOT_INSTRUCTION = `OUTPUT ONLY the ':::snapshot' hero block (and the '#' report title immediately after it). Nothing else. No preamble. No later sections. Stop after the title line.`;

const SECTION_FINAL_POSITION_INSTRUCTION = `OUTPUT ONLY the ':::final-position' block exactly as specified by the FINAL POSITION RULE. Do not emit a heading, prose, or any other content. The block must appear verbatim with all six fields: classification, conviction, primary_driver, failure_trigger, timing, operator_dependency. classification must be one of REAL / PARTIAL / ILLUSION aligned to the Reality Check for the headline capability. Stop immediately after the closing ':::'.`;

function sectionBodyInstruction(headingMarkdown: string, guidance: string, additional?: string): string {
  return [
    `OUTPUT ONLY the markdown for the "${headingMarkdown}" section. Begin your response with that exact heading line and go directly into the content. Do NOT repeat earlier sections. Do NOT re-emit the ':::snapshot' block or '#' title. Do NOT write a closing remark.`,
    guidance,
    additional ?? "",
    `Operate in PROVE / STRESS-TEST / DECIDE mode. Every claim must cite a specific artifact, score, or the absence of one. Name the edge case that would break each claim. End the section with a single bolded '**Next Step:**' or '**Verdict:**' line stating the action implied \u2014 never end on a descriptive sentence.`,
    `Use the full token budget. Paragraphs 3-6 sentences (80-170 words) of specific analysis with named artifacts, quantified impact, and concrete detail. Tables must be multi-line markdown. No repetition with other sections \u2014 every sentence adds NEW information.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const MASTER_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "commercial_pain", label: "Commercial pain & solution fit", maxTokens: 1800, instruction: sectionBodyInstruction("## 1. Commercial Pain & Solution Fit", "Read every fact in this section directly from the canonical [commercial_pain_summary] block. Do not invent commercial pain content. Cover, in order: problem statement, buyer persona, pain severity, pain frequency, cost of pain, current alternative, why the status quo fails, customer demand evidence (clearly separating artifact_backed_evidence from intake_only_claims), solution fit, technical necessity, promised outcome, and outcome proof. State the Commercial Pain Confidence score and band on its own bullet line in the form 'Commercial Pain Confidence: <score> / 100 — <band>'. Reproduce the operator's report_rationale verbatim as a blockquote. List missing_evidence and contradictions explicitly. If the block reports STATUS: Commercial Pain Validation not yet completed, write that as the section body, tag [LOW EVIDENCE RELIABILITY], and end with a **Next Step:** line that flags the commercial validation gap.") },
  { id: "architecture", label: "System & architecture reality", maxTokens: 2200, instruction: sectionBodyInstruction("## 2. System & Architecture Reality", "Reconstruct the actual system from artifacts and contrast it line-by-line with what marketing claims. Name every component, vendor, version, and data store. Include a multi-line table: Component | Stated | Observed | Evidence | Gap. Call out at least 2 specific mismatches between deck/marketing and architecture docs with page-level citations. Name the single architectural decision most likely to break at 3x growth and why. End with a takeaway in a blockquote and a bold **Next Step:** stating whether the architecture supports the company's stated direction as-is, with conditions, or not at all.") },
  { id: "credibility", label: "Product credibility breakdown", maxTokens: 1800, instruction: sectionBodyInstruction("## 3. Product Credibility Breakdown", "Prove whether the product actually delivers value or is a thin wrapper around something else. Quantify: % of workflow truly handled by the product, claimed accuracy vs observed benchmark, # of named customers using the feature in production, reference-call findings if available. Identify the demo-vs-production gap: what fails under adversarial input, edge cases, or production concurrency that does not fail in a scripted demo. Include a scores bullet list (capability vs wrapper, demo-production gap, customer vs claimed, differentiation — each on its own 'Label: X.X / 5' line). Name at least 2 specific missing proofs and the artifact that would close each. End with **Next Step:** credible / credible-with-conditions / superficial.") },
  { id: "data", label: "Data position", maxTokens: 1400, instruction: sectionBodyInstruction("## 4. Data Position", "Classify the data: (a) proprietary and compounding, (b) operational but replaceable, or (c) commoditized. Prove it with data volume (GB / rows), growth rate, exclusive rights, and contract clauses. State whether a competitor could replicate from public sources. Include a table: Data Asset | Classification | Source | Exclusivity | Replication Cost. End with **Next Step:** one of the three classifications with a one-sentence rationale.") },
  { id: "vendor", label: "Vendor & dependency risk", maxTokens: 1500, instruction: sectionBodyInstruction("## 5. Vendor & Dependency Risk", "Quantify exposure per vendor: % of compute spend, contract expiry, auto-renewal terms, price protection, volume commitments, termination clauses. Include a table: Vendor | Dependency | Contract Term | Switching Cost ($ + weeks) | Fallback | Risk [tag]. Name at least one hidden dependency. State margin compression risk in bps if the primary vendor raises prices by 25%.") },
  { id: "failure_modes", label: "Failure mode analysis", maxTokens: 1600, instruction: sectionBodyInstruction("## 6. Failure Mode Analysis", "Top 3 production failure modes. For each: the trigger, the technical failure path (component / service / API), the impact (% revenue, $ impact, or # customers affected), whether a mitigation exists today (yes/partial/no), and what a correct mitigation looks like with owner and effort. Present as a multi-line table: Failure Mode | Trigger | Technical Failure Point | Impact | Existing Mitigation | Needed Mitigation.") },
  { id: "governance", label: "Governance stress test", maxTokens: 1500, instruction: sectionBodyInstruction("## 7. Governance Stress Test", "Stress-test the controls. For logging, access control, incident response, change management, data retention, and third-party risk: name the precise edge case that breaks the control, the resulting failure, the impact, and whether auditability is real or superficial. Include a governance scores bullet list. End with one blockquote takeaway and a **Next Step:** on whether controls are audit-ready, patch-ready, or must be rebuilt.") },
  { id: "production", label: "Production reality check", maxTokens: 1400, instruction: sectionBodyInstruction("## 8. Production Reality Check", "Scale ceiling: at what user/request volume does cost, latency, or reliability break? Quantify cost-per-unit today, project it at 3x and 10x scale. Name the top 2 cost-explosion triggers and the top 2 reliability triggers, each with a numeric threshold.") },
  { id: "scores", label: "Score decomposition", maxTokens: 1600, instruction: sectionBodyInstruction("## 9. Score Decomposition", "For each dimension: render as 'Label: X.X / 5' bullet, then a short paragraph explaining WHY it earned that exact score (cite rubric + evidence) and WHAT specific change (named artifact or control) would move it +1.0 point. Cover every scored dimension.") },
  { id: "impact", label: "What this means", maxTokens: 1400, instruction: sectionBodyInstruction("## 10. What This Means", "Translate findings into outcomes: (a) what could break the company (quantified impact), (b) what limits growth (specific bottleneck + cost curve), (c) what changes the picture if the company is sold, partnered with, or scaled. Include a scenario table: Scenario | Key Assumption | Revenue Impact | Position Impact | Probability. Cover base / bull / bear.") },
  { id: "gaps", label: "Evidence gaps", maxTokens: 1200, instruction: sectionBodyInstruction("## 11. Evidence Gaps", "Enumerate the specific artifacts missing that would change confidence. For each gap: the artifact name, which section(s) it would uplift, the expected confidence lift (+X points), and whether it is obtainable now or later. Tag affected sections [LOW CONFIDENCE]. Use a multi-line table. Cross-reference missing commercial validation evidence from [commercial_pain_summary] when applicable.") },
  { id: "final_position", label: "Final position", maxTokens: 300, instruction: SECTION_FINAL_POSITION_INSTRUCTION },
];

// Sections render in order and are concatenated by the orchestrator.
// No ':::snapshot' or ':::final-position' fences here — the spec is
// plain markdown end-to-end, with no manual section number prefixes
// (the renderer auto-numbers H2 headings).
const IC_MEMO_SECTIONS: AdvancedReportSection[] = [
  {
    id: "snapshot",
    label: "Decision snapshot (visuals)",
    maxTokens: 1100,
    instruction: [
      `OUTPUT ONLY the report title and the visual snapshot blocks. Begin your response with the title line "# Executive Decision Brief — <TARGET>" (substitute the actual TARGET value from the user prompt). If the user prompt includes "DEMO MODE: true", emit on the next line — and on its own line — the italic demo subtitle exactly: "*<value of DEMO SUBTITLE from the user prompt>*". If "DEMO MODE: true" is NOT present, OMIT the subtitle line entirely.`,
      `After the title (and optional subtitle), emit FOUR ":::"-fenced blocks in this exact order. Do NOT emit any markdown heading in this section — no "## Decision Snapshot", no "## Investment Committee Read"; the next section produces the prose.`,
      `Block 1 — ":::snapshot" hero card. Format:\n:::snapshot\nrecommendation: <Proceed | Proceed with Conditions | Pause Pending Evidence | Do Not Proceed Based on Current Evidence>\nposture: <CRITICAL | HIGH | MEDIUM | LOW | OK>   # technical / AI risk posture\nconfidence: <integer 0–100>\nthesis: <single plain-English executive sentence — the one-sentence read>\nstrengths:\n- <artifact-supported strength>\n- <artifact-supported strength>\n- <artifact-supported strength>\nrisks:\n- <key risk>\n- <key risk>\n- <key risk>\n:::\nStrict rules for the snapshot: strengths MUST be artifact-supported — if fewer than three exist, list "No artifact-supported strength identified." for the missing slots; never pad with intake / management claims. Recommendation MUST match the system-prompt thresholds.`,
      `Block 2 — ":::dimensions" six-card score grid. Format (one row per dimension, in this fixed order):\n:::dimensions\nproduct_credibility | <0.0–5.0> | <Supported | Partially Supported | Missing / Required | Contradicted> | <≤ 16-word rationale>\ntooling_exposure | <0.0–5.0> | <status> | <rationale>\ndata_sensitivity | <0.0–5.0> | <status> | <rationale>\ngovernance_safety | <0.0–5.0> | <status> | <rationale>\nproduction_readiness | <0.0–5.0> | <status> | <rationale>\nopen_validation | <0.0–5.0> | <status> | <rationale>\n:::\nUse the dimension scores from the evidence context's "[dimension scores]" block when available (treat values as 0–5). If a dimension score is absent, infer it from the supporting evidence — never invent. Optionally add sub-criterion rows beneath a dimension row, each starting with "> " — format "> <sub_key> | <0.0–5.0> | <≤ 14-word rationale>". Add sub-criteria only when the evidence supports the breakdown.`,
      `Block 3 — ":::coverage" three-column evidence visual. Format:\n:::coverage\nsupported:\n- <area backed by an artifact in the context>\npartial:\n- <area where artifacts exist but coverage is incomplete>\nmissing:\n- <area with no supporting artifact>\n:::\nApply the same anti-contradiction discipline as the system prompt: an artifact category present in the evidence cannot appear under "missing".`,
      `Block 4 — ":::callout" continuous-diligence note. Emit verbatim:\n:::callout label="Continuous Diligence"\nAs more artifacts are added, the evidence base, risk posture, and confidence view update.\n:::`,
      `EVIDENCE-RETRIEVAL CHECK: before emitting any of the four blocks, verify that the evidence_context contains actual extracted artifact passages (excerpts, paraphrased page content, or specifically-cited fields) — not just a filename inventory. If the context only carries filenames or "[document]"-style entries with no extracted content, do NOT emit the four blocks. Instead, after the title (and optional subtitle), emit the heading "## Decision Snapshot" followed by the Evidence Retrieval Failure Notice block defined in the system prompt verbatim (as a markdown blockquote). Do not invent snapshot fields, dimension scores, or coverage entries under the failure path.`,
    ].join("\n\n"),
  },
  {
    id: "ic_read",
    label: "Investment Committee Read",
    maxTokens: 800,
    instruction: [
      `OUTPUT ONLY the "## Investment Committee Read" section. Begin your response with the heading line "## Investment Committee Read" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice (under any heading), OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, use plain labels (no bullets, no bold) followed by content on the next line(s). Match this skeleton, separated by blank lines:`,
      `Recommendation:\n<Proceed | Proceed with Conditions | Pause Pending Evidence | Do Not Proceed Based on Current Evidence — must equal the value emitted in the snapshot block>`,
      `Technical / AI Risk Posture:\n<Low | Moderate | High | Critical — must equal the snapshot posture>`,
      `Confidence:\n<integer 0–100>/100  # must equal the snapshot confidence`,
      `One-Sentence Read:\n<single plain-English executive sentence — should mirror the snapshot thesis>`,
      `Primary Decision Driver:\n<single biggest reason behind the recommendation>`,
      `Confidence Rationale:\n<one short paragraph: evidence coverage + material open diligence gaps>`,
      `Top Strengths:\n1. <artifact-supported strength, or "No artifact-supported strength identified.">\n2. <artifact-supported strength, or "No artifact-supported strength identified.">\n3. <artifact-supported strength, or "No artifact-supported strength identified.">`,
      `Top Risks:\n1. <Risk>\n2. <Risk>\n3. <Risk>`,
      `Evidence Basis:\nSupported areas:\n- <artifact-supported area>\n\nPartially supported areas:\n- <partially supported area>\n\nMissing / required areas:\n- <missing artifact or evidence area>`,
      `Strict rules: Strengths MUST be artifact-supported — never pad with intake / management claims. Recommendation MUST match evidence coverage and risk posture per the system prompt thresholds. Cite artifact names verbatim from the evidence context. Do NOT emit any of the later sections here — they are produced in subsequent calls. Do NOT re-emit any ":::" block.`,
    ].join("\n\n"),
  },
  {
    id: "supported_findings",
    label: "What the evidence actually supports",
    maxTokens: 1400,
    instruction: [
      `OUTPUT ONLY the "## What The Evidence Actually Supports" section. Begin your response with the heading line "## What The Evidence Actually Supports" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "02 ·" or any number.`,
      `List 3–5 findings supported by uploaded evidence. If fewer than 3 material findings are supported, write a single sentence: "Only <number> material artifact-supported findings were identified in the current evidence package." and emit just those findings.`,
      `EVIDENCE-RETRIEVAL CHECK: if the prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR if evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, for EACH finding emit a heading "### Finding <N>. <Title>" then plain labels (no inline bold prefixes, no bullets):`,
      `Evidence Status:\n<Supported | Partially Supported>`,
      `What the evidence supports:\n<state ONLY what uploaded artifacts support>`,
      `Why it matters:\n<relevance to product credibility, technical risk, governance, production readiness, commercial credibility, or post-close execution>`,
      `Evidence:\n- Artifact: <artifact name>\n- Location: <page / section / field, or "Not specified">\n- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content>\n- Supports: <the specific claim this evidence backs>\n- Still missing: <the specific validation gap that remains>`,
      `Cite artifacts by filename verbatim from the evidence context. Never invent filenames. Never write "<artifact> provides insights …" without the five-line Evidence block. Stop after the last finding.`,
    ].join("\n\n"),
  },
  {
    id: "claims_validation",
    label: "Claims requiring validation",
    maxTokens: 900,
    instruction: [
      `OUTPUT ONLY the "## Claims Requiring Validation" section. Begin your response with the heading line "## Claims Requiring Validation" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "03 ·" or any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, below the heading emit ONE multi-line markdown table with a header row and a separator row on its own line:`,
      `| Claim | Current Source | Evidence Status | Why It Matters | Required Evidence |\n|---|---|---|---|---|`,
      `Rules: Current Source uses reader-facing labels — "Intake response", "Management/input claim", "Uploaded artifact: <filename>", or "Missing / Required". Do NOT expose internal context tags like "[commercial_pain_summary]". Evidence Status MUST be one of Supported | Partially Supported | Missing / Required | Contradicted | Management/Input Claim Only. Do NOT treat management / input claims as facts. Do NOT treat unverified claims as strengths. Why It Matters explains the diligence risk concisely (≤ 18 words). Required Evidence names the specific artifact or data that would resolve the claim.`,
      `Stop immediately after the final data row. Do not emit any other heading or prose.`,
    ].join("\n\n"),
  },
  {
    id: "strengths",
    label: "Three most important strengths",
    maxTokens: 1100,
    instruction: [
      `OUTPUT ONLY the "## Three Most Important Strengths" section. Begin your response with the heading line "## Three Most Important Strengths" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "04 ·" or any number.`,
      `Only include strengths that are artifact-supported. If NO artifact-supported strengths exist in the evidence context, emit ONLY this paragraph after the heading and stop: "No artifact-supported strengths were identified from the current evidence package. The current record may contain promising claims, but they are not yet sufficiently supported by uploaded evidence."`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, for EACH strength (up to three) emit a heading "### Strength <N>. <Title>" then plain labels:`,
      `Evidence Status:\n<Supported | Partially Supported>`,
      `Why it matters:\n<strategic or diligence relevance>`,
      `Evidence:\n- Artifact: <artifact name>\n- Location: <page / section / field, or "Not specified">\n- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content>\n- Supports: <the specific posture / capability / control-maturity finding this evidence backs>\n- Still missing: <the specific validation gap that remains>`,
      `Confidence:\n<High | Moderate | Low> — <brief rationale>`,
      `What could weaken this strength:\n<specific missing evidence, contradiction, dependency, or condition>`,
      `Strict: each strength must describe what the evidence actually proves about the company's posture, capability, or control maturity — not the artifact's existence. The Title and "Why it matters" must read as a finding (e.g. "Documented AI system architecture and model-routing layer", "Privacy policy establishes a baseline data-handling posture", "Security attestations provide partial evidence of control maturity"), not a filename. If only an artifact name is available with no posture finding behind it, that strength does NOT qualify — drop it.`,
      `If the supporting artifact does not validate implementation, effectiveness, or operating maturity, set Evidence Status to "Partially Supported" and explicitly state what is still missing in "What could weaken this strength".`,
      `Never elevate intake / management claims to strengths. Cite artifacts by filename verbatim. Stop after the last strength.`,
    ].join("\n\n"),
  },
  {
    id: "risks",
    label: "Three most important risks",
    maxTokens: 1300,
    instruction: [
      `OUTPUT ONLY the "## Three Most Important Risks" section. Begin your response with the heading line "## Three Most Important Risks" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "05 ·" or any number.`,
      `List the 3 most material risks from the current evidence package. Pull from the Technical Risk Register summary if it appears in the evidence context.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, for EACH risk emit a heading "### Risk <N>. <Title>" then plain labels:`,
      `Risk Level:\n<Critical | High | Medium | Low>`,
      `Evidence Status:\n<Supported | Partially Supported | Missing / Required | Contradicted | Management/Input Claim Only>`,
      `What we know:\n<what evidence supports>`,
      `What is missing:\n<what evidence is missing>`,
      `Why it matters:\n<consequence for valuation, scaling, enterprise adoption, compliance approval, model reliability, customer trust, gross margin durability, or post-close execution>`,
      `Evidence:\n- Artifact: <artifact name>  OR  "Missing / Required" if no artifact applies\n- Location: <page / section / field, or "Not specified">\n- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content, or "No extracted content available — diligence gap">\n- Supports: <the specific risk this evidence substantiates>\n- Still missing: <the specific validation gap that remains>`,
      `Required follow-up:\n<specific next diligence request>`,
      `Forbidden: unsupported dollar values or percentages, "regulatory penalties" without evidence (prefer "regulatory, customer trust, and enterprise adoption exposure"), bracketed severity tags like [HIGH], "[L1]"/"[L2]"/"[L3]", a per-risk "Decision:" line, "No direct evidence, inferred from …".`,
      `Stop after the closing "Required follow-up" of the third risk.`,
    ].join("\n\n"),
  },
  {
    id: "walk_away",
    label: "What would walk this away",
    maxTokens: 700,
    instruction: [
      `OUTPUT ONLY the "## What Would Walk This Away" section. Begin your response with the heading line "## What Would Walk This Away" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "06 ·" or any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, identify the SINGLE biggest potential deal-breaking issue based on current evidence. Frame it as the inability to validate something material BEFORE that thing is used to support valuation — not as a confirmed failure. Plain labels (no bullets):`,
      `Potential walk-away issue:\n<specific issue, framed as: "The company cannot validate <X, Y, Z> before those claims are used to support valuation.">`,
      `Why it could break the deal:\n<diligence-language explanation: if these areas remain unresolved, the buyer cannot confidently underwrite AI performance, margin durability, enterprise adoption risk, or post-close operating exposure>`,
      `Current evidence status:\n<Supported | Partially Supported | Missing / Required | Contradicted | Management/Input Claim Only — use "Partially Supported / Missing / Required" if multiple statuses apply across the cited gaps>`,
      `Evidence:\n- Artifact: <artifact name>  OR  "Missing / Required" if no artifact applies\n- Location: <page / section / field, or "Not specified">\n- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content, or "No extracted content available — diligence gap">\n- Supports: <the specific concern this evidence substantiates>\n- Still missing: <the specific validation gap that remains>`,
      `What would need to be true to continue:\n<specific pass criteria — name the concrete artifacts the company would need to provide (e.g. model evaluation metrics, cost-per-inference data, SOC 2 Type II or equivalent control evidence, customer contracts, incident response documentation)>`,
      `Do NOT exaggerate. Do NOT label something a deal-breaker if it is only a missing-document issue resolvable with a follow-up artifact request — frame those as walk-away IF the company is unwilling or unable to produce the artifacts.`,
    ].join("\n\n"),
  },
  {
    id: "confidence_improvers",
    label: "What would most improve confidence",
    maxTokens: 900,
    instruction: [
      `OUTPUT ONLY the "## What Would Most Improve Confidence" section. Begin your response with the heading line "## What Would Most Improve Confidence" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "07 ·" or any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, below the heading emit ONE multi-line markdown table identifying the 3–5 evidence items that would most lift the diligence conclusion:`,
      `| Priority | Evidence Needed | Why It Matters | Owner | Pass Criterion |\n|---|---|---|---|---|`,
      `Rules: Priority numbers 1, 2, 3 (highest first). Evidence Needed names a concrete artifact or dataset (e.g. product architecture documentation, model evaluation metrics, drift monitoring evidence, data provenance documentation, vendor and API dependency list, cost-per-inference / usage metrics, customer contracts or redacted enterprise agreements, incident logs / postmortems, customer proof / retention data — only when relevant to the actual evidence gaps). Owner names the responsible role/team (e.g. "Company CTO", "Reader diligence team"). Pass Criterion is a specific, testable condition.`,
      `Stop immediately after the final data row. Do not emit any other heading or prose.`,
    ].join("\n\n"),
  },
  {
    id: "commercial_pain",
    label: "Commercial pain read",
    maxTokens: 800,
    instruction: [
      `OUTPUT ONLY the "## Commercial Pain Read" section. Begin your response with the heading line "## Commercial Pain Read" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "08 ·" or any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, summarize commercial pain ONLY from artifact-supported context in the evidence (the canonical commercial-pain block, plus any extracted artifact passages relevant to commercial pain). Use clean reader-facing source labels — "Intake response", "Management/input claim", "Uploaded artifact: <filename>", "Missing / Required" — not internal context tags like "[commercial_pain_summary]". If commercial pain evidence is missing or incomplete, do NOT write "Not yet completed / 100" — instead write "Commercial pain confidence cannot be fully scored from the current evidence package." for the Confidence value.`,
      `Plain labels:`,
      `Commercial Pain Confidence:\n<integer 0–100>/100  OR  Insufficient evidence to score`,
      `Rationale:\n<one short paragraph based on available artifacts>`,
      `What is supported:\n- <supported commercial evidence>  (or "None artifact-supported.")`,
      `What is missing:\n- <only the commercial-evidence gaps actually present, drawn from items like customer interviews, renewal / churn data, sales pipeline evidence, win/loss analysis, ROI proof, pricing / willingness-to-pay evidence, case studies or customer outcomes>`,
      `Evidence:\n- Artifact: <artifact name>  OR  "Missing / Required" if no artifact applies\n- Location: <page / section / field, or "Not specified">\n- Extracted support: <specific paraphrased evidence taken from the artifact's extracted content, or "No extracted content available — diligence gap">\n- Supports: <the specific commercial-pain claim this evidence backs>\n- Still missing: <the specific validation gap that remains>`,
    ].join("\n\n"),
  },
  {
    id: "overall_read",
    label: "Overall read",
    maxTokens: 700,
    instruction: [
      `OUTPUT ONLY the "## Overall Read" section. Begin your response with the heading line "## Overall Read" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block. Do NOT prefix the heading with "09 ·" or any number.`,
      `EVIDENCE-RETRIEVAL CHECK: if prior_markdown shows the Decision Snapshot emitted the Evidence Retrieval Failure Notice, OR evidence_context still contains only an artifact inventory with no extracted passages, emit ONLY this single italic line under the heading and stop: "*Section deferred — see the Evidence Retrieval Failure Notice in the Decision Snapshot.*"`,
      `Otherwise, write 2–3 concise paragraphs answering, in this order:`,
      `1. What does the current evidence actually prove?`,
      `2. What remains unverified?`,
      `3. What should the reader do next?`,
      `Use hedging vocabulary where evidence is partial or missing — phrases such as "The current evidence package does not yet validate …", "This remains unresolved based on available artifacts …". Do NOT invent dollar amounts, ARR, percentages, or valuation implications. This brief INFORMS the investment decision; never frame it as the final decision.`,
      `End with EXACTLY this final block, on its own lines, separated by a blank line from the preceding paragraph:`,
      `Recommended Next Step:\n<one clear next diligence action>.`,
      `Forbidden: ":::"-fenced blocks, JSON, YAML, hidden tags, classification fields, a "Decision:" line, fabricated numbers, or any closing remark after the Recommended Next Step block.`,
    ].join("\n\n"),
  },
];

// Sections render in order and are concatenated by the orchestrator.
// No ':::snapshot' or ':::final-position' fences here — the spec is
// plain markdown end-to-end. Severity / Likelihood numerics live in
// the summary table; per-risk detail blocks repeat the rationale.
const RISK_REGISTER_SECTIONS: AdvancedReportSection[] = [
  {
    id: "snapshot",
    label: "Decision snapshot",
    maxTokens: 700,
    instruction: [
      `OUTPUT ONLY the report title and the Decision Snapshot section. Begin your response with the title line "# Technical Risk Register — <TARGET NAME>" (substitute the actual TARGET value from the user prompt). If the user prompt includes "DEMO MODE: true", emit on the next line — and on its own line — the italic demo subtitle exactly: "*<value of DEMO SUBTITLE from the user prompt>*". If "DEMO MODE: true" is NOT present, OMIT the subtitle line entirely. Then a blank line, then the heading "## Decision Snapshot". Do not emit any other section. Do not emit any ":::"-fenced block.`,
      `Use plain labels (no bullets, no bold) followed by content on the next line(s). Match this skeleton exactly, separated by blank lines:`,
      `Technical Risk Posture: Low | Moderate | High | Critical`,
      `Confidence: <integer 0–100>/100`,
      `Rationale:\n<one or two sentences citing evidence coverage and material gaps only — no fabricated context>`,
      `Top Risks:\n1. <Risk name>\n2. <Risk name>\n3. <Risk name>`,
      `Evidence Coverage Summary:\nSupported areas:\n- <area backed by an artifact in the context>\n\nPartially supported areas:\n- <area where artifacts exist but coverage is incomplete>\n\nMissing / required areas:\n- <area with no supporting artifact in the context>`,
      `ANTI-CONTRADICTION CHECK before emitting: every artifact category present in the evidence context (Model / AI System Documentation, Data Handling Privacy Policy, Security Compliance Attestations, Vendor / API Dependency Inventory, etc.) MUST appear under "Supported areas" — never list any of these as fully missing. Use "Partially supported areas" for categories where artifacts exist but coverage is incomplete (financial unit economics, model dependency detail, compliance maturity, vendor concentration analysis). Reserve "Missing / required areas" for categories with no supporting artifact at all (full product architecture documentation, cost-per-inference detail, customer contracts or redacted enterprise agreements, incident logs and post-mortems, SOC 2 report or SOC 2 readiness evidence, model evaluation metrics and drift monitoring evidence).`,
      `Cite artifact names verbatim from the evidence context — do not invent filenames. Confidence must use the "<n>/100" format. Stop after the Missing / required areas list. Do NOT emit the Risk Register Summary Table, Detailed Risks, or Overall Interpretation here — they are produced in later sections.`,
    ].join("\n\n"),
  },
  {
    id: "summary_table",
    label: "Risk register summary table",
    maxTokens: 1400,
    instruction: [
      `OUTPUT ONLY the "## Risk Register Summary Table" section. Begin your response with the heading line "## Risk Register Summary Table" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block.`,
      `Below the heading, emit ONE multi-line markdown table with a header row and a separator row on its own line, using EXACTLY this column set and alignment:`,
      `| ID | Risk | Evidence Status | Severity | Likelihood | Why It Matters | Required Follow-Up |\n|---|---|---|---:|---:|---|---|`,
      `Rules for the table:`,
      `- Emit 8–10 data rows ordered by Severity × Likelihood descending. Cap at 10. Do not pad.`,
      `- ID column: R1, R2, … numbered to match the Detailed Risks section that will follow.`,
      `- Evidence Status column: exactly one of Supported | Partially Supported | Missing / Required | Contradicted. The status here MUST equal the per-risk Evidence Status in the Detailed Risks section.`,
      `- Severity column: a single integer 1–5 (1 = Low, 2 = Moderate, 3 = Material, 4 = High, 5 = Critical).`,
      `- Likelihood column: a single integer 1–5 (1 = Unlikely, 2 = Possible, 3 = Moderate, 4 = Likely, 5 = Highly likely).`,
      `- Why It Matters: at most 18 words, naming the business or technical consequence. Avoid the weak phrasings listed in the system prompt.`,
      `- Required Follow-Up: at most 18 words, naming the specific artifact or action that would resolve the risk.`,
      `- Combine overlapping risks into one row (e.g. "model drift" + "missing eval metrics" → one). No two rows may collapse to the same root cause.`,
      `- Do not include a "Decision:" or "Posture:" column. Do not add bracketed severity tags like [HIGH].`,
      `Stop immediately after the final data row. Do not emit any other heading or prose.`,
    ].join("\n\n"),
  },
  {
    id: "critical",
    label: "Detailed risks (R1–R5)",
    maxTokens: 2600,
    instruction: [
      `OUTPUT ONLY the "## Detailed Risks" heading and the first FIVE detailed risk blocks. Begin your response with the heading line "## Detailed Risks" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block.`,
      `Emit five risks as "### R1. <Risk Name>" through "### R5. <Risk Name>", matching the IDs, names, and Evidence Status used in the Risk Register Summary Table above (highest Severity × Likelihood first). The Evidence Status here MUST equal the table row.`,
      `For EACH risk, emit these labelled blocks IN THIS EXACT ORDER. Each label on its own line, content on the line(s) below — NO inline "**Label:** value" format, NO bullets:`,
      `System Area:\n<one of Architecture | Model Reliability | Data Governance | Security & Compliance | Vendor Dependency | Cost Structure | Incident Response | Customer Contracts | Production Operations>`,
      `Evidence Status:\n<Supported | Partially Supported | Missing / Required | Contradicted — must equal the summary-table row>`,
      `What We Know:\n<short, scannable diligence prose — 1–3 sentences citing the supporting artifact by name, or stating plainly that no evidence exists yet>`,
      `What Is Missing:\n<specific artifacts, data, metrics, or explanations needed to validate>`,
      `Why It Matters:\n<plain-English business / technical consequence; tie to valuation, margin, scale, enterprise sales, compliance, or post-close execution>`,
      `Severity:\n<integer 1–5> — <brief rationale>`,
      `Likelihood:\n<integer 1–5> — <brief rationale>`,
      `Risk Score:\n<Severity × Likelihood>`,
      `Business Impact:\n<qualitative impact language unless the evidence in context provides a quantified figure verbatim. Use the required phrasings from the system prompt — "Gross margin and valuation risk if inference costs scale faster than revenue or pricing power", "Scalability and operating leverage risk if the architecture cannot support expected production load", "Operational resilience risk if incidents cannot be detected, escalated, resolved, and reviewed consistently" — or write "Quantification requires additional evidence: <specific missing data>.">`,
      `Required Evidence:\n<the exact documents or data needed>`,
      `Recommended Mitigation:\n<specific and practical — e.g. "begin SOC 2 readiness", "produce architecture documentation", "validate inference cost model"; avoid unrealistic timelines>`,
      `Pass Criterion:\n<a clear evidence-based test for whether the risk has been reduced>`,
      `Residual Risk:\n<Low | Moderate | High> — <brief reason for what may remain>`,
      `Use the hedging vocabulary from the system prompt for any risk whose Evidence Status is "Partially Supported" or "Missing / Required" — phrases such as "The current evidence package does not yet validate …", "This remains unresolved based on available artifacts …", "The artifact set partially supports this area but does not yet establish …", or "The risk is not confirmed, but it remains material because …". Do not overstate certainty.`,
      `Keep each risk tight and diligence-style — short, scannable lines, not multi-paragraph LLM prose.`,
      `Forbidden: ":::"-fenced blocks, JSON, YAML, code fences, hidden tags, "[L1]"/"[L2]"/"[L3]", "[CRITICAL]"/"[HIGH]"/"[MEDIUM]"/"[LOW]", a per-risk "Decision:" line, "No direct evidence, inferred from …", or fabricated dollar / percentage / ARR / valuation figures.`,
      `Stop after the closing "Residual Risk" line of R5. Do not emit R6 or later — they are produced in the next section.`,
    ].join("\n\n"),
  },
  {
    id: "medium",
    label: "Detailed risks (R6–R10)",
    maxTokens: 2400,
    instruction: [
      `OUTPUT ONLY the next detailed risk blocks (R6 through R10 if 10 risks total; if only 8 or 9 risks total, emit just the remaining ones — do not pad). Continue numbering from R6. Do NOT re-emit "## Detailed Risks" or any earlier heading. Do not emit any ":::"-fenced block.`,
      `Use the same per-risk structure and the same ordering rules as R1–R5: heading "### R<N>. <Risk Name>" then the labelled blocks (System Area / Evidence Status / What We Know / What Is Missing / Why It Matters / Severity / Likelihood / Risk Score / Business Impact / Required Evidence / Recommended Mitigation / Pass Criterion / Residual Risk) — each label on its own line with content on the next line, no inline bold prefixes, no bullets.`,
      `Each risk MUST be a DISTINCT root cause from R1–R5 — never restate an earlier risk from a different angle. The Evidence Status here MUST match the corresponding row in the summary table.`,
      `Apply the hedging vocabulary from the system prompt for any risk whose Evidence Status is "Partially Supported" or "Missing / Required". Apply the required Business Impact phrasings from the system prompt.`,
      `If the evidence supports fewer than 10 material risks total, emit only the real remaining ones and add a single closing sentence in italics: "*Additional risk categories were excluded because they were duplicative, immaterial, or not supported by the current evidence package.*". Never invent risks to fill the count.`,
      `Forbidden: ":::"-fenced blocks, JSON, code fences, hidden tags, bracketed severity labels, a per-risk "Decision:" line, fabricated numbers, or the prior closing phrase "Register stops at R8 — additional categories had no supporting or material missing evidence."`,
      `Stop after the closing "Residual Risk" line of the last risk emitted (or after the italic closing sentence if fewer than 10 risks).`,
    ].join("\n\n"),
  },
  {
    id: "interpretation",
    label: "Overall technical risk interpretation",
    maxTokens: 700,
    instruction: [
      `OUTPUT ONLY the "## Overall Technical Risk Interpretation" section. Begin your response with the heading line "## Overall Technical Risk Interpretation" exactly. Do not repeat earlier sections. Do not emit any ":::"-fenced block.`,
      `Write 2–3 concise paragraphs that answer, in this order:`,
      `1. The central technical risk pattern (what the register's shape says about the target).`,
      `2. What must be validated before the target can be trusted.`,
      `3. Which 3–5 artifacts would most improve confidence (name them concretely — e.g. "SOC 2 Type II report", "current architecture diagram with data flows", "model evaluation results vs holdout", "incident logs and post-mortems", "redacted enterprise customer agreements").`,
      `Use the hedging vocabulary from the system prompt — do not overstate certainty. Do not invent dollar amounts, ARR, percentages, or valuation implications. This report INFORMS the investment decision; never frame it as the final investment decision.`,
      `End with EXACTLY this final block, on its own lines, separated by a blank line from the preceding paragraph:`,
      `Recommended Next Step:\n<one clear next diligence action>.`,
      `Forbidden: ":::"-fenced blocks, JSON, YAML, hidden tags, classification fields, a "Decision:" line, fabricated numbers, or any closing remark after the Recommended Next Step block.`,
    ].join("\n\n"),
  },
];

const VALUE_CREATION_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "actions", label: "Top 7 actions (ranked)", maxTokens: 2400, instruction: sectionBodyInstruction("## 1. Top 7 Actions (Ranked)", "For each of 7 actions: '### A<N>. <Action Title>' heading, then bullet fields — What (specific deliverable), Why (risk/opportunity it resolves with evidence tie-back), Owner (role), Effort (person-weeks + $), Payoff (quantified: bps margin / $ revenue / % churn / ms latency), Dependencies, Pass Criterion. No generic 'improve' language.") },
  { id: "leverage", label: "High-leverage picks & cost reduction", maxTokens: 1300, instruction: sectionBodyInstruction("## 2. High-Leverage Picks & Cost Reduction", "Sub-sections '### High-Leverage Picks' (which 2 actions create disproportionate value and why — show the math on revenue or position impact) and '### Cost Reduction Opportunities' (specific moves: routing, caching, reserved capacity, contract renegotiation — each with $ savings).") },
  { id: "risk_reduction", label: "Risk reduction moves", maxTokens: 1000, instruction: sectionBodyInstruction("## 3. Risk Reduction Moves", "Which actions materially reduce catastrophic failure risk? Tie each to a specific failure mode. Quantify residual risk before and after.") },
  { id: "plan", label: "30 / 60 / 90 execution plan", maxTokens: 1800, instruction: sectionBodyInstruction("## 4. 30 / 60 / 90 Execution Plan", "Use '### 0-30 Days', '### 31-60 Days', '### 61-90 Days' sub-headings. For each phase, use a table: Workstream | Owner | Deliverable | Pass Criterion. Every row must be specific and testable.") },
  { id: "roadmap", label: "Roadmap & team next steps", maxTokens: 1800, instruction: sectionBodyInstruction("## 5. Roadmap & Team Next Steps", "Per-team roadmap the company can hand directly to its teams. Use one '### ' sub-heading per team in this order (omit a team only if the evidence has no signal for it): Product, Engineering / Platform, Data & Analytics, Security & Governance, GTM / Commercial, Finance / Ops. Under each team emit ONE multi-line markdown table with columns: Horizon (0-30 / 31-60 / 61-90) | Next Step | Trigger (cite specific finding, score, or artifact) | Owner | Score or Metric Moved | Pass Criterion. At least 2 rows per team when evidence supports it; do not pad with generic items. End the section with one blockquote naming the single move the CEO should personally own for the first 30 days, and a bold **Next Step:** line stating whether the roadmap is sufficient to hit the Day-90 review or must be rescoped.") },
  { id: "metrics", label: "Measurable outcomes", maxTokens: 900, instruction: sectionBodyInstruction("## 6. Measurable Outcomes", "Table: Metric | Baseline | Target | Timeline | Dashboard/Instrumentation. Cover cost-per-unit, p95 latency, gross margin, retention, customer count, and at least one quality metric (accuracy, error rate, citation fidelity). Include at least one unit-economics metric (cost-per-output by workflow, % traffic on lower-cost tier, or budget adherence).") },
  { id: "final_position", label: "Final position", maxTokens: 300, instruction: SECTION_FINAL_POSITION_INSTRUCTION },
];

const COMPETITIVE_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "archetypes", label: "Comparable archetypes", maxTokens: 1300, instruction: sectionBodyInstruction("## 1. Comparable Archetypes", "Define 3-4 real competitive archetypes relevant to this company's category (examples: 'horizontal API-wrapper copilot', 'data-moat vertical incumbent', 'workflow-integrated platform', 'open-source with managed tier'). For each: one-sentence capability definition, one public or widely-known example, and the structural advantage/weakness that defines the archetype. Table columns: Archetype | Capability Core | Public Example | Structural Advantage | Structural Weakness.") },
  { id: "positioning", label: "Relative positioning", maxTokens: 1300, instruction: sectionBodyInstruction("## 2. Relative Positioning", "Place the company within the archetypes. Assign a posture per capability axis (technical sophistication, proprietary data, workflow depth, distribution, governance) on the Leader / Competitive / Parity / Lagging scale. Show the specific capability delta that justifies each placement. Table columns: Capability Axis | Posture | Closest Archetype | Delta vs Archetype | Evidence.") },
  { id: "wins", label: "Where it wins", maxTokens: 1100, instruction: sectionBodyInstruction("## 3. Where It Wins", "Capability-backed wins only. For each win: the specific system, data, or distribution advantage, the evidence, the customer outcome it produces, and why a competitor cannot trivially replicate it. No marketing claims. Minimum 3 wins, maximum 5.") },
  { id: "losses", label: "Where it falls behind", maxTokens: 1100, instruction: sectionBodyInstruction("## 4. Where It Falls Behind", "Structural gaps only — things that cannot be fixed in <12 months. For each: the gap, the competitor archetype that exploits it, the quantified impact (churn risk, win-rate delta, revenue ceiling), and the reason it is structural rather than tactical.") },
  { id: "hidden", label: "Hidden weakness", maxTokens: 1000, instruction: sectionBodyInstruction("## 5. Hidden Weakness", "Name the ONE positioning element that looks strong today but is structurally fragile. Cite the exact evidence that exposes the fragility (artifact + section, contract clause, architectural dependency, or named vendor reliance). Explain what event collapses it and the impact on revenue or position.") },
  { id: "strategic", label: "Durable or replaceable", maxTokens: 1000, instruction: sectionBodyInstruction("## 6. Durable or Replaceable", "Decide: is this company building something DURABLE or something REPLACEABLE? Defend the call with the specific compounding or eroding forces (data flywheel, workflow lock-in, distribution lock, vendor leverage, talent density). End with **Verdict:** Durable / Contested / Replaceable.") },
  { id: "outlook", label: "2-year outlook", maxTokens: 1000, instruction: sectionBodyInstruction("## 7. Two-Year Outlook", "Stress-test the position under two futures: (a) underlying technology capability doubles and core costs drop 70%, (b) a well-capitalized incumbent (name the archetype) ships a comparable feature in 12 months. For each future: does the position improve, hold, or deteriorate? Quantify the impact on win-rate, revenue, or churn. End with **Next Step:** whether the position supports the company's stated direction.") },
  { id: "final_position", label: "Final position", maxTokens: 300, instruction: SECTION_FINAL_POSITION_INSTRUCTION },
];

const COVERAGE_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "inventory", label: "Artifact inventory", maxTokens: 1100, instruction: sectionBodyInstruction("## 1. Artifact Inventory", "Every artifact analyzed, with exact filename/category. Table columns: Artifact | Category (Product/Data/Infra/Governance/Financial) | Pages or Size | Freshness (date) | Usability [tag].") },
  { id: "commercial_pain_evidence", label: "Commercial pain evidence coverage", maxTokens: 1300, instruction: sectionBodyInstruction("## 2. Commercial Pain Evidence Coverage", "Audit the [commercial_pain_summary] block, separating five categories with one row each in a multi-line table: Artifact-Backed Commercial Evidence (cite items from artifact_backed_evidence verbatim), Intake-Only Commercial Claims (cite items from intake_only_claims verbatim), Unsupported Management Claims (any claim referenced in problem_statement / promised_outcome / cost_of_pain that is NOT in artifact_backed_evidence — quote the field), Missing Commercial Validation Evidence (read missing_evidence verbatim and translate each missing factor into the artifact request that would close it), and Contradictions Between Intake and Artifacts (read contradictions verbatim and surface as [CONTRADICTION DETECTED]). Table columns: Category | Item | Source Field | Evidence Type [L1/L2/L3] | Action to Resolve. End with a bold **Next Step:** line stating whether commercial validation is decision-ready, directional, or absent. If the block reports STATUS: Commercial Pain Validation not yet completed, write that as the section body, tag [LOW EVIDENCE RELIABILITY], and state the seven categorical answers required as the Action to Resolve.") },
  { id: "coverage", label: "Coverage by dimension", maxTokens: 1800, instruction: sectionBodyInstruction("## 3. Coverage by Dimension", "For each scoring dimension (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation): Evidence present (cite specific artifacts + sections), Evidence missing (name the artifact that would close the gap), Coverage rating (High/Medium/Low). Use a table.") },
  { id: "confidence", label: "Confidence scoring", maxTokens: 1000, instruction: sectionBodyInstruction("## 4. Confidence Scoring", "Assign 0-100 confidence to each dimension score and justify based on artifact strength, recency, and corroboration. Use a table: Dimension | Score | Confidence | Justification.") },
  { id: "unsupported", label: "Unsupported conclusions", maxTokens: 900, instruction: sectionBodyInstruction("## 5. Unsupported Conclusions", "Identify every place where a conclusion rests on weak or indirect evidence. Name the conclusion, cite the weak evidence, and state what would strengthen it.") },
  { id: "gaps", label: "Critical gaps", maxTokens: 900, instruction: sectionBodyInstruction("## 6. Critical Gaps", "Missing artifacts ranked by impact on the read. Table: Gap | Impact on Outcome | Obtainable Now? | Action to Request. Cross-reference any missing commercial validation evidence from [commercial_pain_summary].") },
  { id: "reliability", label: "Overall reliability", maxTokens: 800, instruction: sectionBodyInstruction("## 7. Overall Reliability", "Decide: can this read be trusted for a real decision? Render a single verdict — Decision-Ready / Directional Only / Not Reliable — supported by the coverage and confidence ratings above. State the single biggest artifact request that would flip reliability from directional to decision-ready, with its expected confidence lift in points. End with a bold **Next Step:** line.") },
  { id: "final_position", label: "Final position", maxTokens: 300, instruction: SECTION_FINAL_POSITION_INSTRUCTION },
];

export const ADVANCED_REPORTS: AdvancedReportConfig[] = [
  {
    id: "master_diligence",
    title: "Company Readiness Report",
    tagline: "A complete, structured view of the company",
    description:
      "A complete, structured view of the company — covering risks, gaps, capabilities, and areas that need attention before moving forward.",
    accent: "from-indigo-600 via-indigo-500 to-violet-500",
    eyebrow: "Read · Company",
    systemPrompt: MASTER_PROMPT,
    userPromptIntro:
      "Produce the Company Readiness Report for the target company below.",
    sections: MASTER_SECTIONS,
  },
  {
    id: "ic_memo",
    title: "Executive Decision Brief",
    tagline: "Key strengths, key risks, what matters most",
    description:
      "A clear, concise summary of the company — key strengths, key risks, and what matters most for decision-making.",
    accent: "from-slate-900 via-slate-800 to-indigo-800",
    eyebrow: "Read · Brief",
    systemPrompt: IC_MEMO_PROMPT,
    userPromptIntro:
      "Write the Executive Decision Brief for the target company below.",
    sections: IC_MEMO_SECTIONS,
  },
  {
    id: "risk_register",
    title: "Technical Risk Register",
    tagline: "Top risks across systems, data, and operations",
    description:
      "Top risks across systems, data, and operations — each with impact, likelihood, and what needs to be addressed.",
    accent: "from-rose-600 via-rose-500 to-amber-500",
    eyebrow: "Read · Risks",
    systemPrompt: RISK_REGISTER_PROMPT,
    userPromptIntro:
      "Produce the Technical Risk Register for the target company below.",
    sections: RISK_REGISTER_SECTIONS,
  },
  {
    id: "competitive_posture",
    title: "Market & Capability Overview",
    tagline: "Where the company stands",
    description:
      "Where the company stands — what it does well, where it falls behind, and what could impact its position.",
    accent: "from-amber-600 via-orange-500 to-rose-500",
    eyebrow: "Read · Market",
    systemPrompt: COMPETITIVE_PROMPT,
    userPromptIntro:
      "Produce the Market & Capability Overview for the target company below.",
    sections: COMPETITIVE_SECTIONS,
  },
  {
    id: "value_creation",
    title: "Action Plan (30/60/90 Days)",
    tagline: "Clear next steps to improve the company",
    description:
      "Clear next steps to improve the company — prioritized actions tied to risk reduction and opportunity.",
    accent: "from-emerald-600 via-emerald-500 to-lime-500",
    eyebrow: "Read · Plan",
    systemPrompt: VALUE_CREATION_PROMPT,
    userPromptIntro:
      "Produce the Action Plan (30/60/90 Days) for the target company below.",
    sections: VALUE_CREATION_SECTIONS,
  },
  {
    id: "evidence_coverage",
    title: "Evidence Confidence Report",
    tagline: "What's supported and what's still unclear",
    description:
      "Shows what's supported by real data — and where information is missing or unclear.",
    accent: "from-slate-700 via-slate-600 to-slate-500",
    eyebrow: "Read · Evidence",
    systemPrompt: COVERAGE_PROMPT,
    userPromptIntro:
      "Produce the Evidence Confidence Report for the target company below.",
    sections: COVERAGE_SECTIONS,
  },
];

export function getAdvancedReportConfig(
  id: string,
): AdvancedReportConfig | null {
  return ADVANCED_REPORTS.find((r) => r.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// REPORT UPDATE PROTOCOL
// Injected as a system-prompt prefix whenever an existing report version is
// supplied to the generation endpoint. Forces the model into versioned-update
// mode instead of a from-scratch generation.
// ---------------------------------------------------------------------------

export const REPORT_UPDATE_PROTOCOL = `REPORT UPDATE PROTOCOL — YOU ARE UPDATING AN EXISTING REPORT, NOT WRITING A NEW ONE.

You have been given:
1. The PRIOR REPORT (existing version).
2. NEW EVIDENCE (updated knowledge base, scores, and/or new artifacts).

Your mandatory operating procedure is:

STEP 1 — PARSE PRIOR STATE
Extract from the prior report:
- All prior claims and their confidence levels
- All prior risk rankings and scores
- All prior classifications (REAL / PARTIAL / ILLUSION, or equivalent)
- The prior FINAL POSITION / verdict
Treat these as the "baseline state". Never silently discard them.

STEP 2 — EVIDENCE DELTA ANALYSIS
For each new artifact or data point, tag it:
- CONFIRMS: new evidence supports the prior claim
- CONTRADICTS: new evidence opposes the prior claim
- ADDS: new evidence introduces information not present before
Never process new evidence without one of these three tags.

STEP 3 — CLAIM REVALIDATION (CRITICAL)
For EVERY prior claim, re-evaluate and assign:
- VALIDATED — still holds under new evidence
- WEAKENED — less certain; downgrade confidence and state why
- INVALIDATED — no longer true; replace with updated claim and explain the exact mechanism of invalidation
No claim may be silently dropped or silently changed.

STEP 4 — CONTRADICTION RESOLUTION
If new evidence conflicts with a prior conclusion:
Label it: [CONTRADICTION DETECTED]
Resolve using evidence hierarchy (direct measurement > vendor contract > management claim > inferred).
State which side wins and why. No unresolved contradictions in the output.

STEP 5 — SCORE & RANKING UPDATE
Recalculate where new evidence changes the picture:
- Risk scores (Severity × Likelihood)
- Top risk rankings — show previous rank → new rank + reason
- Value lever rankings — same format
Show: Previous: #N → Updated: #M — [reason]

STEP 6 — SECTION-LEVEL UPDATE DISCIPLINE
When updating any section:
- Add an [UPDATE NOTE] callout immediately after the section heading where content changed.
- Format: > **[UPDATE NOTE]** — *What changed*: … | *Why*: … | *Impact*: …
- If no material change to a section: add > **[NO CHANGE]** — prior analysis upheld.
- Do NOT rewrite sections that have not changed. Quote the prior language and confirm it.
- Do NOT regenerate the entire report unless >50% of claims are invalidated (if you do, state this threshold was crossed).

STEP 7 — MANDATORY CHANGE LOG
After the last report section, emit a fenced change log block:

\`\`\`change-log
Claims Updated:
- [old claim] → [new claim]

Risks Re-ranked:
- [Risk Title]: #N → #M — [reason]

New Risks Added:
- [list or "None"]

Invalidated Assumptions:
- [list or "None"]

Confidence Changes:
- [Dimension]: [Old %] → [New %] — [reason]
\`\`\`

STEP 8 — FINAL POSITION DIFF
After the change log, emit a diff block showing how the final position moved. This is SEPARATE from and ADDITIONAL to the mandatory absolute ':::final-position' block at the very end of the report (see FINAL POSITION RULE) — both must appear in update mode. Emit:

\`\`\`final-position-diff
PREVIOUS:
  Classification: [prior verdict]
  Conviction: [prior 0-100]
  Primary Driver: [prior one-liner]

UPDATED:
  Classification: [new verdict or "No change"]
  Conviction: [new 0-100 or "No change"]
  Primary Driver: [new one-liner or "No change — prior position upheld"]
\`\`\`

STRICT RULES:
- Every update is traceable — no anonymous overwrites.
- Every invalidation is explained.
- Every claim is either VALIDATED, WEAKENED, or INVALIDATED — never silently carried forward.
- The output must be parseable as a versioned analytical document, not a fresh report.`;

/**
 * Wraps the base report system prompt with the update protocol when the
 * operator is re-generating from an existing report version.
 */
export function buildUpdateSystemPrompt(basePrompt: string): string {
  return `${REPORT_UPDATE_PROTOCOL}\n\n---\n\n${basePrompt}`;
}

// ============================================================================
// AI CATEGORY DILIGENCE — Phase 4 catalog
// ============================================================================
// Ten on-demand reports framed for an AI *category* (not a single company).
// Each entry inherits FORMAT_RULES + OPERATING_MODE and is single-call (no
// `sections`) — they are tighter than the master target reports and target
// 4-6 dense pages. Filtering is opt-in via `getAdvancedReportsForSubject`,
// so the existing target catalog and `ADVANCED_REPORTS` array are unchanged
// for every existing caller.

function buildCategoryPrompt(focus: string, mandate: string): string {
  return `You are a senior AI category analyst writing for an investment committee. Your subject is an AI *category* (e.g. "AI legal research", "AI agent infra"), not a single company. Reason across the whole category — incumbents, challengers, buyer shape, provider landscape, regulatory pressure — and produce a category-level read.

FOCUS: ${focus}

MANDATE: ${mandate}

${OPERATING_MODE}

${FORMAT_RULES}`;
}

export const CATEGORY_ADVANCED_REPORTS: AdvancedReportConfig[] = [
  {
    id: "category_qualification_snapshot",
    subject_kind: "category",
    title: "Category Qualification Snapshot",
    tagline: "Is this category investable right now?",
    description:
      "One-page top-of-funnel verdict on whether the category clears the basic investability bar — market shape, buyer pull, regulatory headroom, and provider landscape.",
    accent: "from-indigo-600 via-indigo-500 to-violet-500",
    eyebrow: "Category · Snapshot",
    systemPrompt: buildCategoryPrompt(
      "Top-of-funnel category qualification.",
      "Render six labelled sections: Category Definition, Buyer Shape, Provider Landscape, Regulatory Headroom, Timing, and Verdict. Verdict is one of INVESTABLE / WATCH / PASS with a single-sentence Primary Driver and a single-sentence Failure Trigger. End with the standard final-position block.",
    ),
    userPromptIntro:
      "Produce the Category Qualification Snapshot for the AI category described below.",
  },
  {
    id: "category_structural_risk_map",
    subject_kind: "category",
    title: "Category Structural Risk Map",
    tagline: "What can break this category — independent of any vendor",
    description:
      "Severity × Likelihood map of the structural risks that hit every player in the category: foundation-model commoditization, incumbent distribution, buyer fragmentation, regulatory shocks, capital-intensity traps.",
    accent: "from-rose-600 via-rose-500 to-amber-500",
    eyebrow: "Category · Risk Map",
    systemPrompt: buildCategoryPrompt(
      "Category-level structural risks.",
      "Produce a ranked risk register table (Risk | Severity 1-5 | Likelihood 1-5 | Risk Score | Trigger | Time-to-Materialization | Hedge). After the table, write a 'Concentrated bets that fail first' paragraph naming the two risks with the highest Risk Score and the named vendor archetypes most exposed.",
    ),
    userPromptIntro:
      "Produce the Category Structural Risk Map for the AI category described below.",
  },
  {
    id: "category_credibility_analysis",
    subject_kind: "category",
    title: "Category Credibility Analysis",
    tagline: "Real product category, or hype cycle?",
    description:
      "Illusion test for the category itself — separates substantive product value from narrative momentum, distinguishes durable buyer pull from analyst noise, and grades the credibility of the most-cited claims.",
    accent: "from-amber-600 via-orange-500 to-rose-500",
    eyebrow: "Category · Credibility",
    systemPrompt: buildCategoryPrompt(
      "Category-level credibility audit.",
      "Classify the category overall as REAL / PARTIAL / ILLUSION. Then audit five most-cited category claims (analyst quotes, vendor marketing, press narratives) — for each, tag [L1/L2/L3], decide TRUE / OVERSTATED / FALSE, and cite the artifact that settles it. Close with a Decision line.",
    ),
    userPromptIntro:
      "Produce the Category Credibility Analysis for the AI category described below.",
  },
  {
    id: "category_dependency_risk",
    subject_kind: "category",
    title: "Category Dependency & Tooling Risk",
    tagline: "Foundation models, infra, and switching costs",
    description:
      "Maps category-wide dependencies on foundation models, GPU/cloud infra, third-party tooling, and data sources. Calls the failure modes when a single provider raises prices, deprecates an API, or goes down.",
    accent: "from-cyan-600 via-sky-500 to-blue-500",
    eyebrow: "Category · Dependencies",
    systemPrompt: buildCategoryPrompt(
      "Provider, model, and tooling dependencies across the category.",
      "Produce a dependency matrix table (Dependency | Concentration | Switching Cost | Time-to-Switch | Failure Mode | Worst-Case Impact). Then a Replacement Test paragraph estimating % category value loss under the two most-likely provider shocks, with the three drivers named.",
    ),
    userPromptIntro:
      "Produce the Category Dependency & Tooling Risk report for the AI category described below.",
  },
  {
    id: "category_governance_expectations",
    subject_kind: "category",
    title: "Category Governance & Safety Expectations",
    tagline: "What buyers, regulators, and auditors will demand",
    description:
      "Forward read on the governance, audit, and safety controls every credible vendor in the category will need within 18 months. Names regulators, named frameworks, and named buyer-imposed requirements.",
    accent: "from-emerald-600 via-emerald-500 to-lime-500",
    eyebrow: "Category · Governance",
    systemPrompt: buildCategoryPrompt(
      "Governance and safety bar across the category.",
      "Section 1: regulatory landscape (cite specific statutes / guidance / enforcement actions, classify Tailwind / Neutral / Headwind). Section 2: buyer-imposed requirements (cite specific MSA clauses or RFP lines from the evidence). Section 3: 18-month minimum credible posture — the named controls a vendor MUST have to win deals.",
    ),
    userPromptIntro:
      "Produce the Category Governance & Safety Expectations report for the AI category described below.",
  },
  {
    id: "category_production_reality",
    subject_kind: "category",
    title: "Category Production Reality",
    tagline: "What 'production-grade' actually means here",
    description:
      "Operator-grade read on the realistic production bar in this category — latency, accuracy, reliability, scale economics, ops burden — and where current vendors actually sit versus the bar.",
    accent: "from-slate-700 via-slate-600 to-slate-500",
    eyebrow: "Category · Production",
    systemPrompt: buildCategoryPrompt(
      "Production-grade bar for the category.",
      "Define the bar (latency, accuracy, reliability, ops burden) with named numeric thresholds. Then table the leading vendors against each threshold with REAL / PARTIAL / ILLUSION tags. Close with a unit-economics block estimating cost behavior at 3x and 10x volume.",
    ),
    userPromptIntro:
      "Produce the Category Production Reality report for the AI category described below.",
  },
  {
    id: "category_open_unknowns",
    subject_kind: "category",
    title: "Category Open Questions & Unknowns",
    tagline: "What we don't yet know — and what would settle it",
    description:
      "Honest inventory of the open questions in the category: ranks them by decision impact, names the artifact or test that would close each, and tags which are knowable in 30 / 90 / 180 days.",
    accent: "from-fuchsia-600 via-purple-500 to-indigo-500",
    eyebrow: "Category · Unknowns",
    systemPrompt: buildCategoryPrompt(
      "Unresolved category-level questions.",
      "Render a ranked open-questions table (Question | Decision Impact 1-5 | Confidence Today | Artifact That Would Close It | Time-to-Close 30/90/180 | Owner Type). Below the table write a 'Cheapest decisive next step' paragraph naming the single artifact request with the highest impact-per-day.",
    ),
    userPromptIntro:
      "Produce the Category Open Questions & Unknowns report for the AI category described below.",
  },
  {
    id: "category_investor_diligence_traps",
    subject_kind: "category",
    title: "Category Investor Diligence Traps",
    tagline: "Where smart investors lose money in this category",
    description:
      "Red-team list of the patterns that have repeatedly burned investors in adjacent or precedent categories — narrative substitution, distribution illusion, model-cost arbitrage, governance debt, single-customer concentration.",
    accent: "from-orange-600 via-red-500 to-rose-600",
    eyebrow: "Category · Traps",
    systemPrompt: buildCategoryPrompt(
      "Recurring failure patterns for investors in this category and its precedents.",
      "Produce 6-8 named traps. For each: a one-sentence description, one named precedent (deal or category) where the trap fired, the diligence question that would have caught it, and a Severity tag.",
    ),
    userPromptIntro:
      "Produce the Category Investor Diligence Traps report for the AI category described below.",
  },
  {
    id: "category_target_screening_criteria",
    subject_kind: "category",
    title: "Category → Target Screening Criteria",
    tagline: "Turn the category read into a screening rubric",
    description:
      "Converts the category diligence into a concrete screening rubric for sourcing individual targets: must-have criteria, disqualifiers, scoring weights, and the order-of-operations for first-pass evaluation.",
    accent: "from-teal-600 via-emerald-500 to-green-500",
    eyebrow: "Category · Screening",
    systemPrompt: buildCategoryPrompt(
      "Category insights → target-level screening rubric.",
      "Section 1: 5-7 must-have criteria (each with a measurable threshold). Section 2: 3-5 immediate disqualifiers. Section 3: scoring weights table totalling 100. Section 4: first-pass evaluation playbook in 5 ordered steps. End with a Decision line on whether the rubric is tight enough to action this quarter.",
    ),
    userPromptIntro:
      "Produce the Category → Target Screening Criteria for the AI category described below.",
  },
  {
    id: "category_coverage_confidence_summary",
    subject_kind: "category",
    title: "Category Coverage & Confidence Summary",
    tagline: "Self-audit of the category diligence itself",
    description:
      "Self-critical audit of the evidence underpinning the category report: artifact inventory, coverage by dimension, 0-100% confidence scoring, unsupported conclusions, critical gaps, and a reliability verdict.",
    accent: "from-slate-700 via-slate-600 to-slate-500",
    eyebrow: "Category · Coverage",
    systemPrompt: buildCategoryPrompt(
      "Self-audit of the category diligence evidence base.",
      "Produce: (1) artifact inventory by type (market_map / analyst_note / expert_memo / pricing_page / product_screenshot_set / vendor_survey / regulatory_citation) with counts and recency; (2) coverage table by scoring dimension with 0-100% confidence; (3) unsupported conclusions list; (4) critical gaps ranked by decision impact; (5) overall reliability verdict (Decision-Ready / Directional Only / Not Reliable) with the one artifact request that would flip it.",
    ),
    userPromptIntro:
      "Produce the Category Coverage & Confidence Summary for the AI category described below.",
  },
];

/**
 * Subject-aware accessor for the report catalog. Returns the full target
 * catalog when called with 'target' (or with no argument), and only the
 * category catalog when called with 'category'. Existing callers that read
 * `ADVANCED_REPORTS` directly continue to see the original target list.
 */
export function getAdvancedReportsForSubject(
  subjectKind: import("@/lib/types").SubjectKind = "target",
): AdvancedReportConfig[] {
  if (subjectKind === "category") return CATEGORY_ADVANCED_REPORTS;
  return ADVANCED_REPORTS;
}

/**
 * Lookup that spans both catalogs — useful for endpoints that already
 * have a report id and need its config without knowing the subject.
 */
export function getAdvancedReportConfigAnySubject(
  id: string,
): AdvancedReportConfig | null {
  return (
    ADVANCED_REPORTS.find((r) => r.id === id) ??
    CATEGORY_ADVANCED_REPORTS.find((r) => r.id === id) ??
    null
  );
}
