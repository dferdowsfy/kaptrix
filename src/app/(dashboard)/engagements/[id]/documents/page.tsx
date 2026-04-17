import { createClient } from "@/lib/supabase/server";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { CoverageMatrix } from "@/components/documents/coverage-matrix";
import type { Document, DocumentRequirement } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: documents }, { data: requirements }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("engagement_id", id)
      .order("uploaded_at", { ascending: false }),
    supabase.from("document_requirements").select("*").order("category"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Document Intake
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload and manage engagement documents. Coverage gaps are highlighted
          below.
        </p>
      </div>

      <CoverageMatrix
        documents={(documents as Document[]) ?? []}
        requirements={(requirements as DocumentRequirement[]) ?? []}
      />

      <DocumentUploader engagementId={id} />

      {/* Document list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">
          Uploaded Documents ({documents?.length ?? 0})
        </h3>
        {documents?.map((doc: Document) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {doc.filename}
              </p>
              <p className="text-xs text-gray-500">
                {doc.category.replace("_", " ")} &middot;{" "}
                {doc.token_count ? `${doc.token_count.toLocaleString()} tokens` : "—"}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                doc.parse_status === "parsed"
                  ? "bg-green-100 text-green-800"
                  : doc.parse_status === "failed"
                    ? "bg-red-100 text-red-800"
                    : doc.parse_status === "parsing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {doc.parse_status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
