"use client";

import { useEffect, useState } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useSystemSignals } from "@/hooks/use-system-signals";
import {
  DIMENSION_SHORT_LABEL,
  formatHeadline,
  type SystemSignalBatch,
} from "@/lib/preview/system-signals";

// Fires a subtle system-terminal style notification whenever the
// knowledge base for the active client recalibrates the scoring model.
// Every bullet in the expanded panel maps to a scoring dimension,
// sub-criterion, or artifact requirement — nothing generic.
export function SystemSignalPill() {
  const { selectedId, ready } = useSelectedPreviewClient();
  const { current, history, dismiss, clearHistory } = useSystemSignals(
    ready ? selectedId : null,
  );
  const [panelOpen, setPanelOpen] = useState(false);

  // Close the panel on route change side-effects: Escape to close.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const headline = current ? formatHeadline(current) : null;

  return (
    <>
      {/* Compact pill — fixed above mobile browser chrome / bottom nav. */}
      <div
        aria-live="polite"
        className="print-hide pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center sm:bottom-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={() => {
            if (!current && history.length === 0) return;
            setPanelOpen(true);
          }}
          className={`pointer-events-auto group inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950/90 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-100 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/5 backdrop-blur transition-all duration-300 ${
            current
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
          aria-label="Open system updates"
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate font-mono tracking-tight">
            {headline ?? ""}
          </span>
          <span aria-hidden className="text-emerald-300/70">
            ›
          </span>
        </button>
      </div>

      {/* Slide-up "System Updates" panel. */}
      {panelOpen && (
        <SystemUpdatesPanel
          latest={current}
          history={history}
          onClose={() => {
            setPanelOpen(false);
            dismiss();
          }}
          onClear={clearHistory}
        />
      )}
    </>
  );
}

function SystemUpdatesPanel({
  latest,
  history,
  onClose,
  onClear,
}: {
  latest: SystemSignalBatch | null;
  history: SystemSignalBatch[];
  onClose: () => void;
  onClear: () => void;
}) {
  // Prefer the latest pulse; fall back to most recent history entry.
  const primary = latest ?? history[0] ?? null;
  const olderHistory = latest ? history.filter((b) => b.id !== latest.id) : history.slice(1);

  return (
    <div
      className="print-hide fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="System Updates"
    >
      <button
        type="button"
        aria-label="Close system updates"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <div
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
              System Update
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {primary ? (
            <BatchView batch={primary} showTimestamp={false} />
          ) : (
            <p className="font-mono text-xs text-slate-500">
              No signals yet. Submit intake, coverage, insights, or
              pre-analysis to recalibrate the scoring model.
            </p>
          )}

          {olderHistory.length > 0 && (
            <div className="mt-6 space-y-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Prior updates
              </p>
              {olderHistory.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-white/5 bg-slate-900/60 p-3"
                >
                  <BatchView batch={b} showTimestamp />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchView({
  batch,
  showTimestamp,
}: {
  batch: SystemSignalBatch;
  showTimestamp: boolean;
}) {
  // Constraint: max 5 bullet groups in expanded view.
  const groups: { title: string; body: React.ReactNode }[] = [];

  if (batch.risks.length > 0) {
    // Group dimensions in header, keep labels in body.
    const dims = Array.from(new Set(batch.risks.map((r) => DIMENSION_SHORT_LABEL[r.dimension])));
    groups.push({
      title: `Risks Added (${dims.join(", ")})`,
      body: (
        <ul className="mt-1 space-y-1">
          {batch.risks.slice(0, 6).map((r, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-xs text-slate-200">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider ${
                  r.severity === "critical"
                    ? "bg-rose-500/20 text-rose-300"
                    : r.severity === "high"
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-slate-500/20 text-slate-300"
                }`}
              >
                {r.severity}
              </span>
              <span className="leading-snug">{r.label}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.gaps.length > 0) {
    groups.push({
      title: "Coverage Gaps Added",
      body: (
        <ul className="mt-1 space-y-1 font-mono text-xs text-slate-200">
          {batch.gaps.slice(0, 6).map((g, i) => (
            <li key={i} className="leading-snug">
              <span className="text-slate-500">— Missing:</span> {g.artifact}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.adjustments.length > 0) {
    groups.push({
      title: "Scoring Model Adjusted",
      body: (
        <ul className="mt-1 space-y-1 font-mono text-xs text-slate-200">
          {batch.adjustments.slice(0, 6).map((a, i) => (
            <li key={i} className="leading-snug">
              {DIMENSION_SHORT_LABEL[a.dimension]} weight{" "}
              <span
                className={
                  a.direction === "up" ? "text-emerald-300" : "text-amber-300"
                }
              >
                {a.direction === "up" ? "↑" : "↓"}
              </span>{" "}
              <span className="text-slate-500">({a.reason})</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.knowledge.length > 0) {
    const total = batch.knowledge.reduce((s, k) => s + k.count, 0);
    const breakdown = batch.knowledge
      .map((k) => `${k.count} from ${sourceLabel(k.source)}`)
      .join(", ");
    groups.push({
      title: "Knowledge Base Updated",
      body: (
        <p className="mt-1 font-mono text-xs text-slate-200">
          <span className="text-emerald-300">+{total}</span> signal
          {total === 1 ? "" : "s"} extracted{" "}
          <span className="text-slate-500">({breakdown})</span>
        </p>
      ),
    });
  }

  return (
    <div className="space-y-3">
      {showTimestamp && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {new Date(batch.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
      {groups.slice(0, 5).map((g, i) => (
        <div key={i}>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            • {g.title}
          </p>
          {g.body}
        </div>
      ))}
    </div>
  );
}

function sourceLabel(
  src: "intake" | "coverage" | "insights" | "pre_analysis" | "positioning",
): string {
  switch (src) {
    case "intake":
      return "intake";
    case "coverage":
      return "coverage";
    case "insights":
      return "prior artifacts";
    case "pre_analysis":
      return "pre-analysis";
    case "positioning":
      return "positioning";
  }
}
