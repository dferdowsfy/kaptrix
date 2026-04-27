"use client";

import { getIntakeSections } from "./sections";
import type { IntakeAnswerValue, IntakeSectionDef } from "./sections/types";

/** Pull the subset of a flat answers blob that belongs to one section. */
export function pickSectionAnswers(
  section: IntakeSectionDef,
  answers: Record<string, IntakeAnswerValue | undefined>,
): Record<string, IntakeAnswerValue> {
  const slice: Record<string, IntakeAnswerValue> = {};
  for (const field of section.fields) {
    const v = answers[field.key];
    if (v === undefined) continue;
    slice[field.key] = v;
  }
  return slice;
}

/**
 * Fire-and-forget PUT into `/api/intake/{id}/sections/{key}` for every
 * registered typed section. Best-effort: failures are swallowed so the
 * legacy intake save path still drives the UI.
 */
export async function syncTypedSections(
  engagementId: string,
  answers: Record<string, IntakeAnswerValue | undefined>,
  options?: { companyId?: string | null },
): Promise<void> {
  for (const section of getIntakeSections()) {
    const slice = pickSectionAnswers(section, answers);
    if (Object.keys(slice).length === 0) continue;
    try {
      await fetch(
        `/api/intake/${encodeURIComponent(engagementId)}/sections/${encodeURIComponent(section.section_key)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: slice,
            company_id: options?.companyId ?? null,
          }),
        },
      );
    } catch {
      // legacy save path is the source of truth — ignore network failures
    }
  }
}
