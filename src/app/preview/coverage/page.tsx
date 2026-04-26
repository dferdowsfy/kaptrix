"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  IndustryCoverageMatrix,
  type IndustryCoverageState,
} from "@/components/documents/industry-coverage-matrix";
import { SectionHeader, PanelHeader } from "@/components/preview/preview-shell";
import { demoDocuments } from "@/lib/demo-data";
import {
  readUploadedDocs,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import type {
  Document,
  DocumentCategory,
  ParseStatus,
} from "@/lib/types";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

// Map an in-flight upload (which has its own status vocabulary including
// "uploading") to the shape the coverage matrix expects so a freshly
// dropped file flips the artifact row from Missing → Processing → Provided
// without a page reload.
function uploadedToDocument(
  d: UploadedDoc,
  engagementId: string,
): Document {
  const parseStatus: ParseStatus =
    d.parse_status === "uploading" || d.parse_status === "queued"
      ? "queued"
      : d.parse_status === "parsing" || d.parse_status === "extracting"
        ? "parsing"
        : d.parse_status === "parsed"
          ? "parsed"
          : "failed";
  return {
    id: d.id,
    engagement_id: engagementId,
    category: d.category as DocumentCategory,
    filename: d.filename,
    storage_path: "",
    file_size_bytes: d.file_size_bytes,
    mime_type: d.mime_type,
    uploaded_at: d.uploaded_at,
    uploaded_by: null,
    parsed_text: d.parsed_text ?? null,
    parse_status: parseStatus,
    parse_error: d.error ?? null,
    token_count: d.token_count ?? null,
  };
}

export default function PreviewCoveragePage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const baseDocuments = snapshot?.documents ?? demoDocuments;
  const engagementId = snapshot?.engagement.id ?? selectedId ?? "preview";

  const uploaded = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );

  const documents = useMemo(
    () => [
      ...baseDocuments,
      ...uploaded.map((d) => uploadedToDocument(d, engagementId)),
    ],
    [baseDocuments, uploaded, engagementId],
  );

  const [, setCoverageState] = useState<IndustryCoverageState | null>(null);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Evidence & Coverage"
        description="Missing artifacts surface as the primary action. Click Upload on any row to open the file picker directly — progress and status appear inline."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PanelHeader
          tone="indigo"
          eyebrow="Required artifacts"
          title="Coverage matrix"
          meta={
            documents.length > 0
              ? `${documents.length} artifact${documents.length === 1 ? "" : "s"}`
              : undefined
          }
        />
        <div className="p-5 sm:p-6">
          <IndustryCoverageMatrix
            documents={documents}
            uploadedDocs={uploaded}
            clientId={selectedId}
            onStateChange={setCoverageState}
          />
        </div>
      </div>
    </div>
  );
}
