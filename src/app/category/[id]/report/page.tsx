"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MI_REPORT_SECTIONS } from "@/lib/market-intelligence/prompts/report-sections";

interface MiReport {
  id: string;
  version: number;
  content_markdown: string;
  section_status: Record<string, "generated" | "error">;
  generated_at: string;
}

interface SectionResult {
  id: string;
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

export default function CategoryReportPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [report, setReport] = useState<MiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<SectionResult[]>(
    MI_REPORT_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      status: "pending",
    })),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-intelligence/${engagementId}/report`);
      if (res.ok) {
        const data = (await res.json()) as MiReport | null;
        setReport(data);
        if (data?.section_status) {
          setSections((prev) =>
            prev.map((s) => {
              const apiStatus = data.section_status[s.id];
              const mapped: SectionResult["status"] =
                apiStatus === "generated" ? "done" : apiStatus === "error" ? "error" : "pending";
              return { ...s, status: mapped };
            }),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateReport() {
    setGenerating(true);
    setSections((prev) => prev.map((s) => ({ ...s, status: "pending" })));

    // Generate section-by-section for progress feedback.
    const sectionMarkdowns: Record<string, string> = {};
    for (const section of MI_REPORT_SECTIONS) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === section.id ? { ...s, status: "generating" } : s,
        ),
      );
      try {
        const res = await fetch(
          `/api/market-intelligence/${engagementId}/report/section`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section_id: section.id }),
          },
        );
        if (res.ok) {
          const data = (await res.json()) as { content: string };
          sectionMarkdowns[section.id] = data.content;
          setSections((prev) =>
            prev.map((s) =>
              s.id === section.id ? { ...s, status: "done" } : s,
            ),
          );
        } else {
          setSections((prev) =>
            prev.map((s) =>
              s.id === section.id ? { ...s, status: "error" } : s,
            ),
          );
        }
      } catch {
        setSections((prev) =>
          prev.map((s) =>
            s.id === section.id ? { ...s, status: "error" } : s,
          ),
        );
      }
    }

    // Save full report.
    const sectionStatus: Record<string, "generated" | "error"> = {};
    for (const s of sections) {
      sectionStatus[s.id] = s.status === "done" ? "generated" : "error";
    }

    const fullMarkdown = MI_REPORT_SECTIONS.map(
      (s) =>
        sectionMarkdowns[s.id] ?? `## ${s.label}\n\n_Section generation failed._`,
    ).join("\n\n---\n\n");

    // Get next version from server.
    const res = await fetch(`/api/market-intelligence/${engagementId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section_ids: MI_REPORT_SECTIONS.map((s) => s.id),
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as MiReport;
      setReport(saved);
    }

    setGenerating(false);
    void load();
  }

  const sectionStatus = (sectionId: string) =>
    sections.find((s) => s.id === sectionId)?.status ?? "pending";

  function statusIcon(status: SectionResult["status"]) {
    if (status === "done") return "✓";
    if (status === "generating") return "⟳";
    if (status === "error") return "✗";
    return "○";
  }

  function statusColor(status: SectionResult["status"]) {
    if (status === "done") return "text-emerald-600";
    if (status === "generating") return "text-fuchsia-600 animate-spin";
    if (status === "error") return "text-rose-500";
    return "text-slate-400";
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markdownToHtml(md: string): string {
    const escaped = escapeHtml(md);
    return escaped
      .replace(/^## (.+)$/gm, "<h2 class=\"text-xl font-bold mt-6 mb-2\">$1</h2>")
      .replace(/^### (.+)$/gm, "<h3 class=\"text-lg font-semibold mt-4 mb-1\">$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^&gt; (.+)$/gm, "<blockquote class=\"border-l-4 border-fuchsia-400 pl-4 italic text-slate-600\">$1</blockquote>")
      .replace(/^---$/gm, "<hr class=\"my-6 border-slate-200\" />")
      .replace(/\n/g, "<br />");
  }

  if (fullscreen && report) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <p className="font-semibold text-slate-800">
            Category Diligence Memo — v{report.version}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Print / PDF
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
        <div
          className="prose prose-slate mx-auto max-w-4xl px-6 py-10"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(report.content_markdown) }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Category Diligence Memo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Full AI-generated diligence memo across {MI_REPORT_SECTIONS.length} sections.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {report && (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              View Full Report
            </button>
          )}
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={generating}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {generating ? "Generating…" : report ? "Re-generate" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Section progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Sections
        </h3>
        <div className="space-y-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50"
            >
              <span className={`text-sm font-bold ${statusColor(s.status)}`}>
                {statusIcon(s.status)}
              </span>
              <span className="flex-1 text-sm text-slate-700">{s.label}</span>
              {s.status === "done" && report && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(
                      activeSection === s.id ? null : s.id,
                    )
                  }
                  className="text-xs font-medium text-fuchsia-600 hover:text-fuchsia-500"
                >
                  {activeSection === s.id ? "Hide" : "Preview"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading report…</div>
      ) : !report ? (
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 py-16 text-center">
          <p className="text-sm text-slate-500 mb-3">
            No report generated yet. Complete intake, evidence, insights, and
            scoring first for the best output.
          </p>
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={generating}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
          >
            Generate Report
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Version {report.version} · Generated{" "}
              {new Date(report.generated_at).toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
            >
              Open Full Report →
            </button>
          </div>
          {activeSection && (
            <div
              className="prose prose-slate mt-5 max-h-96 overflow-y-auto text-sm"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(
                  extractSection(report.content_markdown, activeSection),
                ),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Extract a section from markdown by heading. */
function extractSection(markdown: string, sectionId: string): string {
  const lines = markdown.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inSection) break;
      const headingText = line.replace(/^## /, "").toLowerCase().replace(/\s+/g, "_");
      if (headingText.includes(sectionId.replace(/_/g, " ").toLowerCase()) || 
          sectionId.includes(headingText)) {
        inSection = true;
        sectionLines.push(line);
      }
    } else if (inSection) {
      if (line === "---") break;
      sectionLines.push(line);
    }
  }

  return sectionLines.join("\n");
}
