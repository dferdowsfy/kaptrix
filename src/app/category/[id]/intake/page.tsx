"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface IntakeQuestion {
  id: string;
  category: string;
  question: string;
  answer?: string;
  is_editable: boolean;
  guidance_note?: string;
}

interface IntakeSet {
  id: string;
  status: "draft" | "confirmed";
  questions: IntakeQuestion[];
  generated_at: string | null;
  confirmed_at: string | null;
  generated_by_model: string | null;
}

export default function CategoryIntakePage() {
  const params = useParams<{ id: string }>();
  const engagementId = params.id;

  const [intake, setIntake] = useState<IntakeSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/intake`,
      );
      if (res.ok) {
        const data = (await res.json()) as IntakeSet | null;
        if (data) {
          setIntake(data);
          const answers: Record<string, string> = {};
          for (const q of data.questions ?? []) {
            answers[q.id] = q.answer ?? "";
          }
          setEditedAnswers(answers);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/intake/generate`,
        { method: "POST" },
      );
      const body = (await res.json()) as { error?: string } | IntakeSet;
      if (!res.ok || "error" in body) {
        setError((body as { error: string }).error ?? "Generation failed");
      } else {
        setIntake(body as IntakeSet);
        const answers: Record<string, string> = {};
        for (const q of (body as IntakeSet).questions ?? []) {
          answers[q.id] = q.answer ?? "";
        }
        setEditedAnswers(answers);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function saveAnswers() {
    if (!intake) return;
    setSaving(true);
    try {
      const updatedQuestions = intake.questions.map((q) => ({
        ...q,
        answer: editedAnswers[q.id] ?? q.answer,
      }));
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/intake`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: updatedQuestions }),
        },
      );
      if (res.ok) {
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirm() {
    if (!intake) return;
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/intake`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm" }),
        },
      );
      if (res.ok) {
        await load();
      }
    } finally {
      setConfirming(false);
    }
  }

  // Group questions by category.
  const byCategory: Record<string, IntakeQuestion[]> = {};
  for (const q of intake?.questions ?? []) {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  }

  const isConfirmed = intake?.status === "confirmed";
  const answeredCount = (intake?.questions ?? []).filter(
    (q) => editedAnswers[q.id]?.trim(),
  ).length;
  const totalCount = intake?.questions.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Intake Questions</h2>
          <p className="mt-1 text-sm text-slate-500">
            LLM-generated questions to surface key assumptions in the thesis.
            Answer them to improve assumption extraction and scoring.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {intake && !isConfirmed && (
            <>
              <button
                type="button"
                onClick={() => void saveAnswers()}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Answers"}
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={confirming || answeredCount === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {confirming ? "Confirming…" : "Confirm Intake"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {generating
              ? "Generating…"
              : intake
              ? "Re-generate"
              : "Generate Questions"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {isConfirmed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Intake confirmed. Re-generate to start a fresh round of questions.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading intake…
        </div>
      ) : !intake ? (
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 bg-white/60 px-5 py-16 text-center">
          <p className="text-sm text-slate-600">
            No intake questions yet. Click{" "}
            <strong>Generate Questions</strong> to create adaptive questions
            from the thesis.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-fuchsia-500 transition-all"
                style={{
                  width: totalCount > 0 ? `${(answeredCount / totalCount) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="shrink-0 font-medium">
              {answeredCount}/{totalCount} answered
            </span>
          </div>

          {Object.entries(byCategory).map(([category, questions]) => (
            <div key={category} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <span className="rounded-full bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200">
                  {category}
                </span>
                <span className="text-xs text-slate-400">
                  {questions.filter((q) => editedAnswers[q.id]?.trim()).length}/{questions.length}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {questions.map((q, idx) => (
                  <div key={q.id} className="px-5 py-4">
                    <label className="block text-sm font-medium text-slate-700">
                      {idx + 1}. {q.question}
                    </label>
                    {q.guidance_note && (
                      <p className="mt-1 text-xs text-slate-400">
                        {q.guidance_note}
                      </p>
                    )}
                    <textarea
                      rows={2}
                      disabled={isConfirmed || !q.is_editable}
                      value={editedAnswers[q.id] ?? ""}
                      onChange={(e) =>
                        setEditedAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        isConfirmed ? "(locked)" : "Your answer…"
                      }
                      className="mt-2 block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!isConfirmed && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void saveAnswers()}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Answers"}
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={confirming || answeredCount === 0}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {confirming ? "Confirming…" : "Confirm Intake"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
