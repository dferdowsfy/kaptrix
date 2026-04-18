import { createHash } from "node:crypto";

/**
 * Compute SHA-256 checksum of a buffer. Used for integrity verification,
 * deduplication, and audit lineage between raw artifact → extracted text.
 */
export function sha256(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
