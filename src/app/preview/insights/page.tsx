"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import {
  readExtractedInsights,
  mergeExtractedInsights,
  subscribeExtractedInsights,
} from "@/lib/preview/extracted-insights";
import {
  readUploadedDocs,
  subscribeUploadedDocs,
  upsertUploadedDoc,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";

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

  // Pre-seeded snapshot insights (demo or real engagement).
  const snapshotInsights = snapshot?.knowledgeInsights ?? demoKnowledgeInsights;

  // Live-updating extracted insights from uploaded documents.
  const extractedInsights = useSyncExternalStore(
    subscribeExtractedInsights,
    () => readExtractedInsights(selectedId),
    () => [] as KnowledgeInsight[],
  );

  // Uploaded docs for the current client — used to determine which
  // documents haven’t been processed through the insight-extraction
  // pass yet (either because the auto-trigger on upload failed, or
  // because they were uploaded before that pipeline existed).
  const uploadedDocs = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );

  // Merge: snapshot first, then any newly extracted insights not already
  // present (de-duplicated by id so we never show the same insight twice).
  const allInsights = useMemo(() => {
    const seen = new Set(snapshotInsights.map((i) => i.id));
    const novel = extractedInsights.filter((i) => !seen.has(i.id));
    return [...snapshotInsights, ...novel];
  }, [snapshotInsights, extractedInsights]);

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

  // ------------------------------------------------------------------
  // Manual extraction trigger. Runs /api/preview/extract-insights for
  // every uploaded doc whose insights haven’t been surfaced yet (or
  // every parsed doc when the operator forces a re-run). Recovers from
  // the upload-time auto-trigger failing, and works for docs uploaded
  // before the extraction pipeline existed.
  // ------------------------------------------------------------------
  const [extractState, setExtractState] = useState<{
    running: boolean;
    processed: number;
    total: number;
    error: string | null;
    lastRunAt: string | null;
  }>({ running: false, processed: 0, total: 0, error: null, lastRunAt: null });

  // A doc is “missing insights” if it has parsed text but either its
  // insights_count is 0 / undefined OR nothing with the ext-<slug>-
  // prefix exists in the extracted-insights store.
  const docsMissingInsights = useMemo(() => {
    const haveByPrefix = new Set(
      extractedInsights.map((i) => i.id.replace(/-\d+$/, "")),
    );
    return uploadedDocs.filter((d) => {
      if (!d.parsed_text || !d.parsed_text.trim()) return false;
      if (d.parse_status === "failed") return false;
      const slug = d.filename
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 24);
      const prefix = `ext-${slug}`;
      return !haveByPrefix.has(prefix);
    });
  }, [uploadedDocs, extractedInsights]);

  const runExtraction = useCallback(
    async (force: boolean) => {
      if (!selectedId) return;
      const targets = force
        ? uploadedDocs.filter((d) => d.parsed_text && d.parsed_text.trim())
        : docsMissingInsights;
      if (targets.length === 0) {
        setExtractState((s) => ({ ...s, error: "No documents need extraction." }));
        return;
      }
      setExtractState({
        running: true,
        processed: 0,
        total: targets.length,
        error: null,
        lastRunAt: null,
      });
      let processed = 0;
      let firstError: string | null = null;
      for (const doc of targets) {
        try {
          upsertUploadedDoc({ ...doc, parse_status: "extracting" });
          const res = await fetch("/api/preview/extract-insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: doc.filename,
              category: doc.category,
              text: doc.parsed_text,
            }),
          });
          let insightsCount = 0;
          if (res.ok) {
            const data = (await res.json()) as {
              insights?: KnowledgeInsight[];
            };
            if (Array.isArray(data.insights) && data.insights.length > 0) {
              mergeExtractedInsights(selectedId, data.insights);
              insightsCount = data.insights.length;
            }
          } else if (!firstError) {
            const err = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            firstError = err.error ?? `HTTP ${res.status}`;
          }
          upsertUploadedDoc({
            ...doc,
            parse_status: "parsed",
            insights_count: (doc.insights_count ?? 0) + insightsCount,
          });
        } catch (err) {
          if (!firstError) {
            firstError =
              err instanceof Error ? err.message : "Network error";
          }
          upsertUploadedDoc({ ...doc, parse_status: "parsed" });
        }
        processed += 1;
        setExtractState((s) => ({ ...s, processed }));
      }
      setExtractState({
        running: false,
        processed,
        total: targets.length,
        error: firstError,
        lastRunAt: new Date().toISOString(),
      });
    },
    [selectedId, uploadedDocs, docsMissingInsights],
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Document intelligence"
        description="Every surfaced insight is automatically added to the intake model and this client's knowledge base. Remove any that shouldn't inform downstream reasoning."
      />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex-1 min-w-[240px]">
          <div className="text-sm font-semibold text-gray-900">
            Extraction status
          </div>
          <div className="mt-0.5 text-xs text-gray-600">
            {extractState.running
              ? `Extracting — ${extractState.processed}/${extractState.total} documents…`
              : docsMissingInsights.length > 0
                ? `${docsMissingInsights.length} uploaded document${docsMissingInsights.length === 1 ? "" : "s"} waiting for insight extraction.`
                : uploadedDocs.length > 0
                  ? `All ${uploadedDocs.length} uploaded document${uploadedDocs.length === 1 ? " has" : "s have"} been processed.`
                  : "No uploaded documents yet — drop files on the Evidence & Coverage page."}
            {extractState.error && !extractState.running ? (
              <span className="ml-1 text-rose-600">
                Last run: {extractState.error}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => runExtraction(false)}
          disabled={
            extractState.running ||
            !selectedId ||
            docsMissingInsights.length === 0
          }
          className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-gray-800"
        >
          {extractState.running
            ? `Extracting… ${extractState.processed}/${extractState.total}`
            : `Generate insights${docsMissingInsights.length > 0 ? ` (${docsMissingInsights.length})` : ""}`}
        </button>
        <button
          type="button"
          onClick={() => runExtraction(true)}
          disabled={extractState.running || uploadedDocs.length === 0}
          className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
          title="Re-run extraction on every parsed document"
        >
          Re-run all
        </button>
      </div>
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
