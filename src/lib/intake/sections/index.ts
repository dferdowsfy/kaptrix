import { COMMERCIAL_PAIN_VALIDATION_SECTION } from "./commercial-pain-validation";
import type { IntakeSectionDef } from "./types";

/**
 * Registry of typed intake sections. Sections registered here are
 * persisted via `intake_responses` (and free-form fields are mirrored
 * into `kb_chunks`). The legacy hardcoded questionnaire keeps working
 * for any section NOT listed here.
 */
const SECTIONS: IntakeSectionDef[] = [COMMERCIAL_PAIN_VALIDATION_SECTION];

export function getIntakeSections(): IntakeSectionDef[] {
  return [...SECTIONS].sort((a, b) => a.display_order - b.display_order);
}

export function getIntakeSection(sectionKey: string): IntakeSectionDef | null {
  return SECTIONS.find((s) => s.section_key === sectionKey) ?? null;
}

export { COMMERCIAL_PAIN_VALIDATION_SECTION };
