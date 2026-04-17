"use client";

import type { Document, DocumentRequirement, CoverageItem, DocumentCategory } from "@/lib/types";

interface Props {
  documents: Document[];
  requirements: DocumentRequirement[];
}

export function CoverageMatrix({ documents, requirements }: Props) {
  const coverageItems: CoverageItem[] = requirements.map((req) => {
    const docs = documents.filter((d) => d.category === req.category);
    let status: CoverageItem["status"] = "missing";
    if (docs.length > 0) {
      const allParsed = docs.every((d) => d.parse_status === "parsed");
      status = allParsed ? "provided" : "partial";
    }
    return { requirement: req, documents: docs, status };
  });

  const provided = coverageItems.filter((c) => c.status === "provided").length;
  const total = coverageItems.length;
  const missingRequired = coverageItems.filter(
    (c) => c.status === "missing" && c.requirement.is_required,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Coverage Matrix
        </h3>
        <span className="text-sm text-gray-500">
          {provided} of {total} categories covered
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {coverageItems.map((item) => (
          <div
            key={item.requirement.category}
            className={`rounded-lg border p-3 ${
              item.status === "provided"
                ? "border-green-200 bg-green-50"
                : item.status === "partial"
                  ? "border-yellow-200 bg-yellow-50"
                  : item.requirement.is_required
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-gray-900">
                {item.requirement.display_name}
              </span>
              <span
                className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  item.status === "provided"
                    ? "bg-green-100 text-green-800"
                    : item.status === "partial"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {item.status === "provided"
                  ? `✓ ${item.documents.length} file${item.documents.length > 1 ? "s" : ""}`
                  : item.status === "partial"
                    ? "Partial"
                    : "Missing"}
              </span>
            </div>
            {item.status === "missing" && (
              <p className="mt-1 text-xs text-gray-500">
                Limits: {item.requirement.limits_when_missing}
              </p>
            )}
          </div>
        ))}
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {missingRequired.length} required category
            {missingRequired.length > 1 ? "ies" : "y"} missing
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This means the analysis cannot fully assess:{" "}
            {missingRequired
              .map((c) => c.requirement.limits_when_missing)
              .join("; ")}
            . Operator may proceed with explicit limitation flags, or request
            additional materials.
          </p>
        </div>
      )}
    </div>
  );
}
