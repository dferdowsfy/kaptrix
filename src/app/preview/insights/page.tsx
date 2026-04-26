"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SectionHeader, PanelHeader } from "@/components/preview/preview-shell";
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
  subscribeExtractedInsights,
} from "@/lib/preview/extracted-insights";
import {
  readUploadedDocs,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import type { Document } from "@/lib/types";
import { GenerateButton } from "@/components/preview/generate-button";
import {
  startInsightsRun,
  useInsightsRunStore,
} from "@/lib/preview/insights-run-store";

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
  const insightsRun = useInsightsRunStore();

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

  const extractionDocs = useMemo<UploadedDoc[]>(() => {
    if (!selectedId) return [];

    const byId = new Map<string, UploadedDoc>();

    const fromSnapshot = documents.map((doc: Document) => ({
      id: doc.id,
      client_id: selectedId,
      filename: doc.filename,
      category: doc.category,
      mime_type: doc.mime_type ?? "application/octet-stream",
      file_size_bytes: doc.file_size_bytes ?? 0,
      uploaded_at: doc.uploaded_at,
      parse_status: doc.parse_status,
      parsed_text: doc.parsed_text ?? undefined,
      token_count: doc.token_count ?? undefined,
      error: doc.parse_error ?? undefined,
    }));

    for (const doc of fromSnapshot) byId.set(doc.id, doc);
    for (const doc of uploadedDocs) byId.set(doc.id, doc);

    return [...byId.values()];
  }, [selectedId, documents, uploadedDocs]);

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

  // A doc is “missing insights” if it has parsed text but either its
  // insights_count is 0 / undefined OR nothing with the ext-<slug>-
  // prefix exists in the extracted-insights store.
  const docsMissingInsights = useMemo(() => {
    const haveByPrefix = new Set(
      extractedInsights.map((i) => i.id.replace(/-\d+$/, "")),
    );
    return extractionDocs.filter((d) => {
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
  }, [extractionDocs, extractedInsights]);

  const isMyRun = insightsRun.clientId === selectedId;
  const extractBusy = insightsRun.status === "running";
  const extractState = {
    running: isMyRun && insightsRun.status === "running",
    processed: isMyRun ? insightsRun.processed : 0,
    total: isMyRun ? insightsRun.total : 0,
    error:
      isMyRun && insightsRun.status === "error"
        ? (insightsRun.error ?? null)
        : null,
    lastRunAt: isMyRun ? (insightsRun.lastRunAt ?? null) : null,
  };

  const runExtraction = useCallback(
    (force: boolean) => {
      if (!selectedId) return;
      const targets = force
        ? extractionDocs.filter((d) => d.parsed_text && d.parsed_text.trim())
        : docsMissingInsights;
      startInsightsRun({
        clientId: selectedId,
        documents: targets,
      });
    },
    [selectedId, extractionDocs, docsMissingInsights],
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Document intelligence"
        description="Every surfaced insight is automatically added to the intake model and this client's knowledge base. Remove any that shouldn't inform downstream reasoning."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PanelHeader
          tone="indigo"
          eyebrow="Pipeline"
          title="Extraction status"
          meta={
            extractState.running
              ? `${extractState.processed} / ${extractState.total}`
              : extractionDocs.length > 0
                ? `${extractionDocs.length} document${extractionDocs.length === 1 ? "" : "s"}`
                : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="flex-1 min-w-[240px] text-sm text-slate-600">
            {extractState.running
              ? `Extracting — ${extractState.processed}/${extractState.total} documents…`
              : docsMissingInsights.length > 0
                ? `${docsMissingInsights.length} uploaded document${docsMissingInsights.length === 1 ? "" : "s"} waiting for insight extraction.`
                : extractionDocs.length > 0
                  ? `All ${extractionDocs.length} uploaded document${extractionDocs.length === 1 ? " has" : "s have"} been processed.`
                  : "No uploaded documents yet — drop files on the Evidence & Coverage page."}
            {extractState.error && !extractState.running ? (
              <span className="ml-1 text-rose-600">
                Last run: {extractState.error}
              </span>
            ) : null}
          </div>
          <GenerateButton
            type="button"
            onClick={() => runExtraction(false)}
            disabled={extractBusy || !selectedId || docsMissingInsights.length === 0}
          >
            {extractState.running
              ? `Extracting… ${extractState.processed}/${extractState.total}`
              : `Generate insights${docsMissingInsights.length > 0 ? ` (${docsMissingInsights.length})` : ""}`}
          </GenerateButton>
          <GenerateButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => runExtraction(true)}
            disabled={extractBusy || extractionDocs.length === 0}
            title="Re-run extraction on every parsed document"
          >
            Re-generate all
          </GenerateButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PanelHeader
          tone="violet"
          eyebrow="Document Intelligence · RAG-backed"
          title="Insights from your data room"
          meta={
            extractionDocs.length > 0
              ? `${extractionDocs.length} indexed · ${activeInsights.length} surfaced`
              : undefined
          }
        />
        <div className="p-5 sm:p-6">
          <KnowledgeInsightsPanel
            documents={documents}
            insights={activeInsights}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </div>
  );
}
