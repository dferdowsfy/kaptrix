"use client";

import type { PreAnalysis } from "@/lib/types";

interface Props {
  analyses: PreAnalysis[];
  engagementId: string;
}

export function PreAnalysisDashboard({ analyses, engagementId }: Props) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          No pre-analysis runs yet. Ensure documents are uploaded and parsed,
          then click &quot;Run Pre-Analysis&quot;.
        </p>
      </div>
    );
  }

  const latestRun = analyses[0];
  const perDocAnalyses = analyses.filter((a) => a.analysis_type === "per_document");
  const synthesis = analyses.find((a) => a.analysis_type === "synthesis");

  return (
    <div className="space-y-6">
      {/* Status overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Documents Analyzed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {perDocAnalyses.length}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Red Flags Found</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {perDocAnalyses.reduce(
              (sum, a) => sum + (a.red_flags?.length ?? 0),
              0,
            )}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Claims Extracted</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {perDocAnalyses.reduce(
              (sum, a) => sum + (a.extracted_claims?.length ?? 0),
              0,
            )}
          </p>
        </div>
      </div>

      {/* Red flags */}
      {perDocAnalyses.some((a) => a.red_flags && a.red_flags.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Red Flags</h3>
          {perDocAnalyses.flatMap((a) =>
            (a.red_flags ?? []).map((flag, i) => (
              <div
                key={`${a.id}-${i}`}
                className={`rounded-lg border p-4 ${
                  flag.severity === "critical"
                    ? "border-red-300 bg-red-50"
                    : flag.severity === "high"
                      ? "border-orange-300 bg-orange-50"
                      : flag.severity === "medium"
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {flag.flag}
                  </p>
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize">
                    {flag.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{flag.evidence}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Dimension: {flag.dimension.replace(/_/g, " ")}
                </p>
              </div>
            )),
          )}
        </div>
      )}

      {/* Claims */}
      {perDocAnalyses.some((a) => a.extracted_claims && a.extracted_claims.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Extracted Claims
          </h3>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Claim
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Source
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {perDocAnalyses.flatMap((a) =>
                  (a.extracted_claims ?? []).map((claim, i) => (
                    <tr key={`${a.id}-claim-${i}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {claim.claim}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {claim.source_location}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            claim.confidence === "high"
                              ? "bg-green-100 text-green-800"
                              : claim.confidence === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {claim.confidence}
                        </span>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
