"use client";

import type { Report, Engagement } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Props {
  report: Report;
  engagement: Engagement;
}

export function ReportPreview({ report, engagement }: Props) {
  const data = report.report_data;

  return (
    <div className="space-y-6 rounded-lg border bg-white p-8 shadow-sm">
      {/* Cover info */}
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            AI Product Diligence Report
          </h2>
          {report.watermark && (
            <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              {report.watermark}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Target: {engagement.target_company_name}
        </p>
        <p className="text-sm text-gray-600">
          Client: {engagement.client_firm_name}
        </p>
        <p className="text-sm text-gray-600">
          Generated: {formatDate(report.generated_at)} · Version {report.version}
        </p>
      </div>

      {/* Executive Summary */}
      {data.executive_summary && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Executive Summary
          </h3>
          <p className="mt-2 text-sm text-gray-700">{data.executive_summary}</p>
        </div>
      )}

      {/* Composite Score */}
      {data.composite_score !== undefined && (
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
          <div className="text-3xl font-bold text-gray-900">
            {data.composite_score.toFixed(1)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Composite Score (out of 5.0)
            </p>
            {data.headline_bullets && data.headline_bullets.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs text-gray-600">
                {data.headline_bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Bottom line */}
      {data.conviction_statement && (
        <div className="rounded-lg border-l-4 border-gray-900 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Bottom Line</h3>
          <p className="mt-1 text-sm text-gray-700">
            {data.conviction_statement}
          </p>
        </div>
      )}

      {/* Methodology */}
      {data.methodology_note && (
        <div className="border-t pt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Methodology
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {data.methodology_note}
          </p>
        </div>
      )}
    </div>
  );
}
