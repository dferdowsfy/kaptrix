"use client";

import type { Report } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface Props {
  reports: Report[];
}

export function ReportVersionList({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          No reports generated yet. Complete scoring to generate a report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Report Versions</h3>
      {reports.map((report) => (
        <div
          key={report.id}
          className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">
              Version {report.version}
            </p>
            <p className="text-xs text-gray-500">
              {formatDateTime(report.generated_at)}
              {report.revision_notes && ` — ${report.revision_notes}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {report.watermark && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
                {report.watermark}
              </span>
            )}
            {report.pdf_storage_path && (
              <a
                href={report.pdf_storage_path}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                Download PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
