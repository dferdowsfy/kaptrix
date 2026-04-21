"use client";

import { useState, useRef } from "react";
import type { DocumentCategory } from "@/lib/types";

interface Props {
  engagementId: string;
}

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "deck", label: "Pitch Deck / Investor Materials" },
  { value: "architecture", label: "Product Architecture" },
  { value: "security", label: "Security & Compliance" },
  { value: "model_ai", label: "Model / AI System Documentation" },
  { value: "data_privacy", label: "Data Handling & Privacy" },
  { value: "customer_contracts", label: "Customer Contracts" },
  { value: "vendor_list", label: "Vendor & API Dependencies" },
  { value: "financial", label: "Financial / Usage Metrics" },
  { value: "incident_log", label: "Incident Log / Post-Mortems" },
  { value: "team_bios", label: "Team Bios / Leadership" },
  { value: "demo", label: "Demo / Product Walkthroughs" },
  { value: "other", label: "Other" },
];

export function DocumentUploader({ engagementId }: Props) {
  const [category, setCategory] = useState<DocumentCategory>("deck");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("engagement_id", engagementId);
    formData.set("category", category);
    Array.from(files).forEach((file) => formData.append("files", file));

    await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Refresh page to show updated documents
    window.location.reload();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Document Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          dragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-sm font-medium text-gray-700">
          {uploading ? "Uploading…" : "Drop files here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, DOCX, XLSX, PPTX, PNG, JPEG, TXT, CSV — max 100MB per file, 50 files per upload
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
