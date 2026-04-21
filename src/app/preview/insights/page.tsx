"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import {
  KnowledgeInsightsPanel,
  type KnowledgeInsight,
} from "@/components/documents/knowledge-insights-panel";
import { demoDocuments, demoKnowledgeInsights } from "@/lib/demo-data";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  mergeInsightIntoAnswers,
  type PreviewAnswers,
} from "@/lib/preview-intake";
import {
  submitToKnowledgeBase,
  type InsightsPayload,
} from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

const REMOVED_STORAGE_PREFIX = "kaptrix.preview.insights.removed:";

function readRemovedIds(clientId: string | null): Set<string> {
  if (typeof window === "undefined" || !clientId) return new Set();
  try {
    const raw = window.localStorage.getItem(
      `${REMOVED_STORAGE_PREFIX}${clientId}`,
    );
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeRemovedIds(clientId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${REMOVED_STORAGE_PREFIX}${clientId}`,
    JSON.stringify([...ids]),
  );
}

export default function PreviewInsightsPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;
  const allInsights = snapshot?.knowledgeInsights ?? demoKnowledgeInsights;

  const [removedIds, setRemovedIds] = useState<Set<string>>(() =>
    readRemovedIds(selectedId ?? null),
  );
  const syncedForClientRef = useRef<string | null>(null);

  useEffect(() => {
    setRemovedIds(readRemovedIds(selectedId ?? null));
  }, [selectedId]);

  const activeInsights = useMemo(
    () => allInsights.filter((i) => !removedIds.has(i.id)),
    [allInsights, removedIds],
  );

  // Auto-insert every suggested intake value and submit the insights
  // payload to the per-client knowledge base whenever the active list
  // changes. The operator no longer has to click "Insert into intake"
  // or "Submit to knowledge base" — any insight that is still present
  // is assumed to be accepted. Removing one pulls it back out.
  useEffect(() => {
    if (!selectedId) return;
    if (typeof window === "undefined") return;

    // Only re-insert into intake the first time we see this client, to
    // avoid clobbering operator edits made directly in intake.
    if (syncedForClientRef.current !== selectedId) {
      syncedForClientRef.current = selectedId;
      const key = `kaptrix.preview.intake.answers.v2:${selectedId}`;
      const legacyRaw = window.localStorage.getItem(PREVIEW_INTAKE_STORAGE_KEY);
      const raw = window.localStorage.getItem(key) ?? legacyRaw;
      let answers: PreviewAnswers = {};
      if (raw) {
        try {
          answers = JSON.parse(raw) as PreviewAnswers;
        } catch {
          answers = {};
        }
      }
      let next = answers;
      for (const insight of activeInsights) {
        next = mergeInsightIntoAnswers(next, insight);
      }
      if (next !== answers) {
        window.localStorage.setItem(key, JSON.stringify(next));
        void fetch("/api/preview/intake", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ engagement_id: selectedId, answers: next }),
        }).catch(() => {});
      }
    }

    // Always refresh the KB payload for the active insight set.
    const by_category: Record<string, number> = {};
    let high_confidence_count = 0;
    for (const i of activeInsights) {
      by_category[i.category] = (by_category[i.category] ?? 0) + 1;
      if (i.confidence === "high") high_confidence_count += 1;
    }
    const payload: InsightsPayload = {
      kind: "insights",
      insights_total: activeInsights.length,
      by_category,
      high_confidence_count,
    };
    const summary = `${activeInsights.length} insights auto-synced · ${high_confidence_count} high-confidence`;
    submitToKnowledgeBase(selectedId, {
      step: "insights",
      submitted_at: new Date().toISOString(),
      summary,
      payload,
    });
  }, [selectedId, activeInsights]);

  const handleRemove = useCallback(
    (insight: KnowledgeInsight) => {
      if (!selectedId) return;
      setRemovedIds((prev) => {
        const next = new Set(prev).add(insight.id);
        writeRemovedIds(selectedId, next);
        return next;
      });
    },
    [selectedId],
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Document intelligence"
        description="Every surfaced insight is automatically added to the intake model and this client's knowledge base. Remove any that shouldn't inform downstream reasoning."
      />
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <KnowledgeInsightsPanel
          documents={documents}
          insights={activeInsights}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
