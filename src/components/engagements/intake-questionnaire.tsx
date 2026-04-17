"use client";

import { useState } from "react";

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

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
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

type Answers = Record<string, string | number | string[]>;

interface Props {
  initialAnswers?: Answers;
  onChange?: (answers: Answers) => void;
}

export function IntakeQuestionnaire({ initialAnswers = {}, onChange }: Props) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);

  const update = (id: string, value: string | number | string[]) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange?.(next);
  };

  const sections = Array.from(new Set(INTAKE_QUESTIONS.map((q) => q.section)));
  const answered = INTAKE_QUESTIONS.filter((q) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return v !== undefined;
  }).length;
  const completionPct = Math.round((answered / INTAKE_QUESTIONS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Intake progress
          </p>
          <p className="mt-0.5 text-sm text-gray-700">
            {answered} of {INTAKE_QUESTIONS.length} prompts completed
          </p>
        </div>
        <div className="w-48">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-500">
            {completionPct}%
          </p>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section} className="space-y-4">
          <h3 className="border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-800">
            {section}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {INTAKE_QUESTIONS.filter((q) => q.section === section).map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => update(q.id, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion;
  value: string | number | string[] | undefined;
  onChange: (v: string | number | string[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-900">{question.prompt}</p>
      {question.help && (
        <p className="mt-1 text-xs text-gray-500">{question.help}</p>
      )}
      <div className="mt-3">
        {question.type === "single" && (
          <div className="space-y-2">
            {question.options?.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  value === opt
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
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
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    checked
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
        )}

        {question.type === "long_text" && (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Free-form response…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
        )}

        {question.type === "scale" && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
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
                  className={`h-10 flex-1 rounded-lg border text-sm font-semibold transition ${
                    value === n
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              Add qualitative context
              <textarea
                rows={2}
                placeholder="Optional free-form note alongside your rating…"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
