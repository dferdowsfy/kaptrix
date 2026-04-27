import type { IntakeQuestion } from "@/components/engagements/intake-questionnaire";
import type { IntakeSectionDef } from "./types";

/**
 * Adapter that lets typed sections render through the legacy
 * `IntakeQuestionnaire` component without a parallel renderer. The
 * questionnaire derives navigation order from question order, so the
 * caller controls placement by prepending / appending the result.
 */
export function sectionToIntakeQuestions(
  section: IntakeSectionDef,
): IntakeQuestion[] {
  return section.fields.map((field) => {
    const base: IntakeQuestion = {
      id: field.key,
      section: section.section_name,
      prompt: field.label,
      help: field.help,
      type: field.type,
      options: field.options,
      scale_min: field.scale_min,
      scale_max: field.scale_max,
      scale_labels: field.scale_labels,
    };
    return base;
  });
}
