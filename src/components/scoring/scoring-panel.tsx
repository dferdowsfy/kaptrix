"use client";

import { useState, useCallback } from "react";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import { calculateCompositeScore } from "@/lib/scoring/calculator";
import type { Score, BenchmarkCase, PatternMatch, ScoreDimension } from "@/lib/types";

interface Props {
  engagementId: string;
  scores: Score[];
  patternMatches: PatternMatch[];
  benchmarkCases: BenchmarkCase[];
  previewMode?: boolean;
}

export function ScoringPanel({
  engagementId,
  scores: initialScores,
  patternMatches,
  benchmarkCases,
  previewMode = false,
}: Props) {
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [expandedDimension, setExpandedDimension] = useState<ScoreDimension | null>(
    "product_credibility",
  );
  const [saving, setSaving] = useState(false);

  const composite = calculateCompositeScore(scores);

  const saveScore = useCallback(
    async (
      dimension: string,
      sub_criterion: string,
      score_0_to_5: number,
      operator_rationale: string,
    ) => {
      if (previewMode) {
        setScores((prev) => {
          const idx = prev.findIndex(
            (s) => s.dimension === dimension && s.sub_criterion === sub_criterion,
          );

          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              score_0_to_5,
              operator_rationale,
              updated_at: new Date().toISOString(),
            };
            return copy;
          }

          return prev;
        });
        return;
      }

      setSaving(true);
      const res = await fetch("/api/scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagement_id: engagementId,
          dimension,
          sub_criterion,
          score_0_to_5,
          operator_rationale,
          evidence_citations: [],
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setScores((prev) => {
          const idx = prev.findIndex(
            (s) => s.dimension === dimension && s.sub_criterion === sub_criterion,
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [...prev, updated];
        });
      }
      setSaving(false);
    },
    [engagementId, previewMode],
  );

  return (
    <div className="space-y-6">
      {/* Composite score */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Composite Score</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {composite.composite_score.toFixed(1)}
              <span className="text-lg text-gray-400"> / 5.0</span>
            </p>
          </div>
          {!previewMode && saving && (
            <span className="text-xs text-gray-400">Saving…</span>
          )}
          {previewMode && (
            <span className="text-xs text-gray-400">
              Preview mode — edits are local only
            </span>
          )}
        </div>

        {/* Dimension score bars */}
        <div className="mt-4 space-y-2">
          {composite.dimension_details.map((dim) => (
            <div key={dim.dimension} className="flex items-center gap-3">
              <span className="w-40 text-xs text-gray-600 truncate">
                {dim.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-900 transition-all"
                  style={{ width: `${(dim.average_score / 5) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-gray-700">
                {dim.average_score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern matches sidebar */}
      {patternMatches.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Pattern Matches</p>
          {patternMatches.map((match) => {
            const benchmark = benchmarkCases.find(
              (b) => b.case_anchor_id === match.case_anchor_id,
            );
            return (
              <div key={match.id} className="mt-2 text-xs text-blue-800">
                <span className="font-mono font-bold">{match.case_anchor_id}</span>
                {benchmark && (
                  <span> — {benchmark.vertical.replace(/_/g, " ")}</span>
                )}
                <p className="mt-0.5 text-blue-700">{match.similarity_reason}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Dimension scoring sections */}
      {SCORING_DIMENSIONS.map((dim) => (
        <div key={dim.key} className="rounded-lg border bg-white shadow-sm">
          <button
            onClick={() =>
              setExpandedDimension(
                expandedDimension === dim.key ? null : dim.key,
              )
            }
            className="flex w-full items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {dim.name}
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                Weight: {(dim.weight * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-sm text-gray-400">
              {expandedDimension === dim.key ? "▼" : "▶"}
            </span>
          </button>

          {expandedDimension === dim.key && (
            <div className="border-t p-4 space-y-6">
              {dim.sub_criteria.map((sub) => {
                const existing = scores.find(
                  (s) => s.dimension === dim.key && s.sub_criterion === sub.key,
                );
                return (
                  <SubCriterionInput
                    key={sub.key}
                    dimension={dim.key}
                    subKey={sub.key}
                    name={sub.name}
                    description={sub.description}
                    initialScore={existing?.score_0_to_5 ?? 0}
                    initialRationale={existing?.operator_rationale ?? ""}
                    onSave={saveScore}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubCriterionInput({
  dimension,
  subKey,
  name,
  description,
  initialScore,
  initialRationale,
  onSave,
}: {
  dimension: string;
  subKey: string;
  name: string;
  description: string;
  initialScore: number;
  initialRationale: string;
  onSave: (
    dimension: string,
    sub_criterion: string,
    score: number,
    rationale: string,
  ) => Promise<void>;
}) {
  const [score, setScore] = useState(initialScore);
  const [rationale, setRationale] = useState(initialRationale);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={score}
          onChange={(e) => setScore(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-center text-sm font-bold text-gray-900">
          {score.toFixed(1)}
        </span>
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        onBlur={() => {
          if (rationale.length >= 20) {
            onSave(dimension, subKey, score, rationale);
          }
        }}
        placeholder="Operator rationale (minimum 2 sentences)…"
        rows={2}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {rationale.length > 0 && rationale.length < 20 && (
        <p className="text-xs text-red-500">
          Rationale must be at least 20 characters
        </p>
      )}
    </div>
  );
}
