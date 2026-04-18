/**
 * Upload validation — MIME, extension, size, magic bytes.
 *
 * Defense in depth against clients mislabeling `file.type`. We:
 *   1. Enforce allowlist on MIME type (must match UPLOAD_LIMITS).
 *   2. Enforce allowlist on file extension.
 *   3. Cross-check extension vs. MIME (prevents .exe renamed to .pdf).
 *   4. Sniff magic bytes for common binary formats.
 *   5. Enforce hard size limit.
 *
 * Callers receive a structured result; never trust client-supplied type.
 */

import { UPLOAD_LIMITS } from "@/lib/constants";

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  effectiveMime?: string;
}

// Canonical extension → MIME mapping for types we accept.
const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
};

// Magic-byte signatures. Office formats are ZIP (PK\x03\x04).
const MAGIC_SIGNATURES: { mime: string; sigs: number[][] }[] = [
  { mime: "application/pdf", sigs: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sigs: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sigs: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sigs: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  },
  { mime: "image/png", sigs: [[0x89, 0x50, 0x4e, 0x47]] },
  { mime: "image/jpeg", sigs: [[0xff, 0xd8, 0xff]] },
  { mime: "video/mp4", sigs: [[0x66, 0x74, 0x79, 0x70]] }, // matches at offset 4
  { mime: "video/webm", sigs: [[0x1a, 0x45, 0xdf, 0xa3]] },
];

function matchesSignature(buf: Buffer, mime: string): boolean {
  const entry = MAGIC_SIGNATURES.find((m) => m.mime === mime);
  if (!entry) return true; // text/csv/txt — no magic bytes
  return entry.sigs.some((sig) => {
    // mp4 starts at offset 4
    const offset = mime === "video/mp4" ? 4 : 0;
    if (buf.length < offset + sig.length) return false;
    return sig.every((b, i) => buf[offset + i] === b);
  });
}

function getExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx + 1) : "";
}

/**
 * Validate an uploaded file. `buffer` only needs the first 64 bytes for
 * magic-byte detection but the full size for the size check.
 */
export function validateUpload(args: {
  filename: string;
  declaredMime: string;
  size: number;
  headBytes: Buffer;
}): ValidationResult {
  const { filename, declaredMime, size, headBytes } = args;

  if (size <= 0) return { ok: false, reason: "Empty file" };
  if (size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: "File exceeds maximum size" };
  }

  const ext = getExtension(filename);
  if (!ext || !(ext in EXT_TO_MIME)) {
    return { ok: false, reason: `Extension .${ext || "(none)"} not allowed` };
  }

  const expectedMime = EXT_TO_MIME[ext];
  if (!UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(expectedMime as never)) {
    return { ok: false, reason: "MIME not in allowlist" };
  }

  // Accept declared MIME only if it matches extension's canonical MIME.
  // Browsers sometimes send application/octet-stream; fall back to ext mapping.
  const effectiveMime =
    declaredMime === expectedMime ? declaredMime : expectedMime;

  // Magic-byte sniff (skip for text types).
  const textTypes = new Set(["text/plain", "text/csv"]);
  if (!textTypes.has(effectiveMime) && !matchesSignature(headBytes, effectiveMime)) {
    return {
      ok: false,
      reason: "File content does not match declared type (magic-byte mismatch)",
    };
  }

  return { ok: true, effectiveMime };
}

/**
 * Produce a safe, tenant-scoped storage path.
 * Prevents path traversal, collisions, and leakage of caller-controlled names.
 */
export function buildStoragePath(args: {
  engagementId: string;
  documentId: string;
  extension: string;
}): string {
  const safeExt = args.extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const safeEng = args.engagementId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeDoc = args.documentId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `engagements/${safeEng}/${safeDoc}.${safeExt}`;
}
