/**
 * Section-driven intake schema. Phase 1 (Commercial Pain Validation)
 * introduces the typed model so future sections can be defined the same
 * way without touching the renderer or the persistence layer.
 *
 * A section maps to one row in `intake_responses` per user. Its fields
 * are split between structured answers (single / multi / scale) and
 * free-form text (short_text / long_text). Free-form values are also
 * persisted as `kb_chunks` rows so downstream modules can treat the
 * response like any other knowledge-base claim.
 */

export type IntakeFieldType =
  | "single"
  | "multi"
  | "short_text"
  | "long_text"
  | "scale";

export interface IntakeField {
  /** Stable id used as the key in structured_answers / raw_text. */
  key: string;
  /** Human-readable prompt shown to the user. */
  label: string;
  help?: string;
  type: IntakeFieldType;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: [string, string];
}

export interface IntakeSectionDef {
  section_key: string;
  section_name: string;
  display_order: number;
  description?: string;
  fields: IntakeField[];
}

/** A field's stored value in `structured_answers` or `raw_text`. */
export type IntakeAnswerValue = string | number | string[] | null;

export type IntakeStructuredAnswers = Record<string, IntakeAnswerValue>;
export type IntakeRawText = Record<string, string>;

export const FREE_FORM_FIELD_TYPES: ReadonlySet<IntakeFieldType> = new Set([
  "short_text",
  "long_text",
]);

export function isFreeFormField(field: IntakeField): boolean {
  return FREE_FORM_FIELD_TYPES.has(field.type);
}
