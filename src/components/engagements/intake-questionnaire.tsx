"use client";

import { useState } from "react";
import {
  INDUSTRY_OPTIONS,
  INDUSTRY_PROFILES,
  type Industry,
} from "@/lib/industry-requirements";

export interface IntakeQuestion {
  id: string;
  section: string;
  prompt: string;
  help?: string;
  type: "single" | "multi" | "short_text" | "long_text" | "scale";
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: [string, string];
}

const CORE_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // Deal context
  {
    id: "deal_thesis",
    section: "Deal Thesis",
    prompt: "What is the client's primary thesis for this investment?",
    help:
      "Select all that apply. You can also free-form additional context. AI will pre-fill based on your uploaded investor materials.",
    type: "multi",
    options: [
      "Category-defining AI platform",
      "Margin expansion via AI efficiency",
      "Rollup / platform acquisition",
      "Defensive hedge in incumbent sector",
      "Strategic data moat",
      "Talent and IP acquisition",
      "Turnaround / operational fix",
    ],
  },
  {
    id: "deal_stage",
    section: "Deal Thesis",
    prompt: "What is the current deal stage?",
    type: "single",
    options: [
      "Pre-LOI / sourcing",
      "LOI signed, early diligence",
      "Confirmatory diligence",
      "Post-LOI repricing",
      "Portfolio review / post-close",
    ],
  },
  {
    id: "diligence_priorities",
    section: "Deal Thesis",
    prompt: "Rank your top diligence concerns",
    help: "Choose up to three. These weight Kaptrix's analysis.",
    type: "multi",
    options: [
      "Are AI claims real or marketing?",
      "Vendor / model concentration",
      "Regulatory exposure",
      "Data sensitivity and tenant isolation",
      "Unit economics at scale",
      "Key-person risk",
      "Competitive defensibility",
      "Enterprise sales readiness",
    ],
  },

  // Target profile
  {
    id: "ai_maturity_perception",
    section: "Target Profile",
    prompt:
      "How AI-mature does the target appear based on public positioning?",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["AI wrapper on workflow", "True AI-native product"],
  },
  {
    id: "primary_architecture",
    section: "Target Profile",
    prompt: "What does the target's primary AI architecture appear to be?",
    type: "single",
    options: [
      "RAG-heavy",
      "Fine-tuned models",
      "Agentic / multi-step tool use",
      "Workflow + embedded AI",
      "Multi-model orchestration",
      "Single-model API wrapper",
      "On-premise / air-gapped",
      "Hybrid",
      "Unknown — to be assessed",
    ],
  },
  {
    id: "known_vendors",
    section: "Target Profile",
    prompt: "Known vendor or model dependencies (if already disclosed)",
    help: "Comma-separated. Pre-fills if mentioned in uploaded docs.",
    type: "short_text",
  },

  // Regulatory
  {
    id: "regulatory_exposure",
    section: "Regulatory Lens",
    prompt: "Which regulatory frameworks apply?",
    type: "multi",
    options: [
      "GDPR / UK GDPR",
      "CCPA / CPRA",
      "HIPAA",
      "SOX",
      "FINRA / SEC",
      "NYDFS Part 500",
      "EU AI Act",
      "FedRAMP",
      "PCI DSS",
      "None material",
    ],
  },
  {
    id: "customer_geographies",
    section: "Regulatory Lens",
    prompt: "Primary customer geographies",
    type: "multi",
    options: [
      "United States",
      "European Union",
      "United Kingdom",
      "Canada",
      "APAC",
      "Latin America",
      "Middle East",
    ],
  },

  // Red flag priors
  {
    id: "red_flag_priors",
    section: "Red Flag Priors",
    prompt: "Any initial concerns you already want us to pressure-test?",
    help:
      "Select any that apply. Kaptrix will elevate related findings in the final report.",
    type: "multi",
    options: [
      "Customer concentration",
      "Founder departure risk",
      "Hallucination / accuracy claims",
      "Security incident history",
      "Pricing / unit economics sustainability",
      "Open-source license exposure",
      "IP / training-data provenance",
      "Competitive displacement",
    ],
  },
  {
    id: "client_risk_appetite",
    section: "Red Flag Priors",
    prompt: "Client's risk appetite for AI-specific exposure",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["Very conservative", "Aggressive / contrarian"],
  },

  // Free-form
  {
    id: "context_notes",
    section: "Context & Notes",
    prompt:
      "Anything the Kaptrix team should know before reading the data room?",
    help:
      "Free-form. Any pre-meeting intel, political sensitivities, or prior diligence context.",
    type: "long_text",
  },
];

const INDUSTRY_INTAKE_QUESTIONS: Record<Industry, IntakeQuestion[]> = {
  financial_services: [
    {
      id: "fs_model_risk_framework",
      section: "Financial Services Depth",
      prompt: "How mature is the model risk framework under SR 11-7?",
      help: "Assess governance for validation, challenge, and override controls.",
      type: "single",
      options: [
        "No formal framework",
        "Draft controls only",
        "Partial framework by product",
        "Operational framework with monitoring",
        "Independent validation in place",
      ],
    },
    {
      id: "fs_decision_explainability",
      section: "Financial Services Depth",
      prompt: "Explainability readiness for regulated decisions",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Opaque outputs", "Regulator-ready explanations"],
    },
    {
      id: "fs_controls_scope",
      section: "Financial Services Depth",
      prompt: "Which controls are in scope for audit?",
      type: "multi",
      options: [
        "SOX controls",
        "Trade surveillance controls",
        "Credit decision controls",
        "Model retraining governance",
        "No defined controls yet",
      ],
    },
  ],
  healthcare: [
    {
      id: "hc_phi_pathways",
      section: "Healthcare Depth",
      prompt: "Does PHI flow through model prompts, logs, or vector indices?",
      type: "single",
      options: [
        "No PHI touches AI pipeline",
        "PHI redacted before model call",
        "PHI allowed with controls",
        "Unknown / not documented",
      ],
    },
    {
      id: "hc_fda_readiness",
      section: "Healthcare Depth",
      prompt: "Regulatory readiness for FDA/SaMD implications",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No classification work", "Clear regulatory pathway"],
    },
    {
      id: "hc_bias_controls",
      section: "Healthcare Depth",
      prompt: "Which clinical bias controls are documented?",
      type: "multi",
      options: [
        "Subgroup performance testing",
        "Fairness thresholds",
        "Independent clinical review",
        "Post-market drift monitoring",
        "No formal controls",
      ],
    },
  ],
  legal_tech: [
    {
      id: "lt_privilege_controls",
      section: "Legal Tech Depth",
      prompt: "How is privilege containment enforced?",
      help: "Technical controls matter more than policy statements for this category.",
      type: "single",
      options: [
        "Policy-only",
        "Logical isolation",
        "Matter-level hard isolation",
        "Dedicated tenant infrastructure",
        "Unknown / not evidenced",
      ],
    },
    {
      id: "lt_citation_assurance",
      section: "Legal Tech Depth",
      prompt: "How strong is citation reliability and hallucination control?",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No reliable controls", "Verified citation pipeline"],
    },
    {
      id: "lt_bar_ethics_exposure",
      section: "Legal Tech Depth",
      prompt: "Potential bar-ethics exposure areas",
      type: "multi",
      options: [
        "Unauthorized practice of law risk",
        "Privilege leakage risk",
        "Client disclosure / consent risk",
        "Hallucinated authority risk",
        "Limited exposure",
      ],
    },
  ],
  saas_enterprise: [
    {
      id: "saas_enterprise_readiness",
      section: "Enterprise SaaS Depth",
      prompt: "Enterprise feature readiness (SSO, SCIM, audit exports)",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Missing core features", "Enterprise-complete"],
    },
    {
      id: "saas_abuse_surface",
      section: "Enterprise SaaS Depth",
      prompt: "Which abuse vectors are most material?",
      type: "multi",
      options: [
        "Prompt injection",
        "Data exfiltration via tool calls",
        "Account takeover on AI admins",
        "Model jailbreak behavior",
        "No formal abuse model",
      ],
    },
    {
      id: "saas_margin_volatility",
      section: "Enterprise SaaS Depth",
      prompt: "Margin volatility risk from model costs",
      type: "single",
      options: [
        "Low — predictable unit costs",
        "Moderate — occasional spikes",
        "High — materially volatile",
        "Unknown / insufficient data",
      ],
    },
  ],
  insurance: [
    {
      id: "ins_fairness_controls",
      section: "Insurance Depth",
      prompt: "How mature are fairness controls for underwriting/claims outputs?",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No controls", "Regulator-ready controls"],
    },
    {
      id: "ins_adverse_action_explainability",
      section: "Insurance Depth",
      prompt: "Adverse action reason-code readiness",
      type: "single",
      options: [
        "Not implemented",
        "Manual and inconsistent",
        "Partially automated",
        "Fully traceable and auditable",
      ],
    },
    {
      id: "ins_regulator_alignment",
      section: "Insurance Depth",
      prompt: "Regulatory frameworks currently mapped",
      type: "multi",
      options: [
        "NYDFS Circular Letter 7",
        "NAIC AI model guidance",
        "State DOI-specific guidance",
        "FCRA / ECOA notices",
        "No explicit mapping",
      ],
    },
  ],
  retail_ecommerce: [
    {
      id: "retail_claim_substantiation",
      section: "Retail & eCommerce Depth",
      prompt: "Readiness for substantiating AI-generated marketing claims",
      type: "single",
      options: [
        "No substantiation workflow",
        "Ad hoc review",
        "Standardized review workflow",
        "Auditable, policy-enforced workflow",
      ],
    },
    {
      id: "retail_personalization_risk",
      section: "Retail & eCommerce Depth",
      prompt: "Personalization risk posture",
      type: "multi",
      options: [
        "Dark pattern risk",
        "Inappropriate demographic targeting",
        "Cross-border consent mismatch",
        "Model drift in recommendations",
        "Low concern",
      ],
    },
    {
      id: "retail_consumer_data",
      section: "Retail & eCommerce Depth",
      prompt: "Consumer data handling maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Weak and undocumented", "Policy + controls + monitoring"],
    },
  ],
  government_defense: [
    {
      id: "gov_authorization_path",
      section: "Government & Defense Depth",
      prompt: "FedRAMP / IL authorization status",
      type: "single",
      options: [
        "No plan",
        "Roadmap only",
        "Sponsor identified",
        "In process with evidence",
        "Authorized",
      ],
    },
    {
      id: "gov_export_controls",
      section: "Government & Defense Depth",
      prompt: "Export-control and controlled-data safeguards",
      type: "multi",
      options: [
        "ITAR controls",
        "CJIS / CUI controls",
        "Geo-fencing and residency",
        "Cleared personnel restrictions",
        "No formal safeguards",
      ],
    },
    {
      id: "gov_supply_chain",
      section: "Government & Defense Depth",
      prompt: "Software supply-chain transparency maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No SBOM/program", "Continuous SBOM + provenance"],
    },
  ],
  industrial_iot: [
    {
      id: "iiot_ot_segmentation",
      section: "Industrial / IoT Depth",
      prompt: "OT segmentation and IT/OT boundary control maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Flat network risk", "Strong segmented architecture"],
    },
    {
      id: "iiot_safety_latency",
      section: "Industrial / IoT Depth",
      prompt: "Safety-critical latency and fail-safe posture",
      type: "single",
      options: [
        "Not measured",
        "Measured with major variance",
        "Stable within safe thresholds",
        "Validated under stress scenarios",
      ],
    },
    {
      id: "iiot_protocol_exposure",
      section: "Industrial / IoT Depth",
      prompt: "Legacy protocol and OT attack surface",
      type: "multi",
      options: [
        "Unencrypted legacy protocols",
        "Weak remote access controls",
        "No OT anomaly detection",
        "Patch latency in field assets",
        "Low material exposure",
      ],
    },
  ],
};

type Answers = Record<string, string | number | string[]>;

interface Props {
  initialAnswers?: Answers;
  onChange?: (answers: Answers) => void;
  defaultIndustry?: Industry;
  onIndustryChange?: (industry: Industry) => void;
}

export function IntakeQuestionnaire({
  initialAnswers = {},
  onChange,
  defaultIndustry = "legal_tech",
  onIndustryChange,
}: Props) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [industry, setIndustry] = useState<Industry>(defaultIndustry);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const profile = INDUSTRY_PROFILES[industry];
  const questions = [...CORE_INTAKE_QUESTIONS, ...INDUSTRY_INTAKE_QUESTIONS[industry]];

  const update = (id: string, value: string | number | string[]) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange?.(next);
  };

  const isAnswered = (q: IntakeQuestion) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return v !== undefined;
  };

  const sections = Array.from(new Set(questions.map((q) => q.section)));
  const currentSection = activeSection && sections.includes(activeSection)
    ? activeSection
    : sections[0];
  const currentIndex = sections.indexOf(currentSection);
  const sectionQuestions = questions.filter((q) => q.section === currentSection);

  const sectionCompletion = (section: string) => {
    const qs = questions.filter((q) => q.section === section);
    const done = qs.filter(isAnswered).length;
    return { done, total: qs.length };
  };

  const answered = questions.filter(isAnswered).length;
  const completionPct = Math.round((answered / questions.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top summary bar */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
              Industry context
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {profile.label}
            </p>
            <p className="text-sm text-slate-600">{profile.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Profile</label>
            <select
              value={industry}
              onChange={(e) => {
                const next = e.target.value as Industry;
                setIndustry(next);
                onIndustryChange?.(next);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {profile.typical_risks.map((risk) => (
            <span
              key={risk}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
            >
              {risk}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {answered} of {questions.length} prompts complete
            </p>
            <p className="text-xs text-slate-500">
              Answers save automatically. Navigate sections on the left.
            </p>
          </div>
          <div className="w-48">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs font-semibold text-slate-600">
              {completionPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Two-column: section nav + current section */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {sections.map((section, idx) => {
              const { done, total } = sectionCompletion(section);
              const isActive = section === currentSection;
              const isComplete = done === total;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isActive
                          ? "bg-white text-slate-900"
                          : isComplete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isComplete ? "✓" : idx + 1}
                    </span>
                    <span className="font-medium">{section}</span>
                  </span>
                  <span
                    className={`text-[11px] tabular-nums ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {done}/{total}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
                Section {currentIndex + 1} of {sections.length}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {currentSection}
              </h3>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {sectionQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={answers[q.id]}
                note={typeof answers[`${q.id}__note`] === "string" ? (answers[`${q.id}__note`] as string) : ""}
                onChange={(v) => update(q.id, v)}
                onNoteChange={(v) => update(`${q.id}__note`, v)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() =>
                setActiveSection(sections[Math.max(0, currentIndex - 1)])
              }
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous section
            </button>
            <button
              type="button"
              disabled={currentIndex === sections.length - 1}
              onClick={() =>
                setActiveSection(
                  sections[Math.min(sections.length - 1, currentIndex + 1)],
                )
              }
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next section →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  note,
  onChange,
  onNoteChange,
}: {
  question: IntakeQuestion;
  value: string | number | string[] | undefined;
  note: string;
  onChange: (v: string | number | string[]) => void;
  onNoteChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <p className="text-base font-semibold text-slate-900">{question.prompt}</p>
      {question.help && (
        <p className="mt-1 text-sm text-slate-600">{question.help}</p>
      )}
      <div className="mt-4">
        {question.type === "single" && (
          <div className="space-y-2">
            {question.options?.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  value === opt
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        )}

        {question.type === "multi" && (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange(
                      checked ? arr.filter((v) => v !== opt) : [...arr, opt],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    checked
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "short_text" && (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        )}

        {question.type === "long_text" && (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Free-form response…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        )}

        {question.type === "scale" && (
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>{question.scale_labels?.[0]}</span>
              <span>{question.scale_labels?.[1]}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {Array.from(
                {
                  length:
                    (question.scale_max ?? 5) - (question.scale_min ?? 1) + 1,
                },
                (_, i) => (question.scale_min ?? 1) + i,
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`h-11 flex-1 rounded-lg border text-base font-semibold transition ${
                    value === n
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {question.type !== "long_text" && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-600">
            Free-form context
            <textarea
              rows={2}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Optional context for this specific question…"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
