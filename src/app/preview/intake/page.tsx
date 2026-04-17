"use client";

import { useEffect, useState } from "react";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { SectionHeader } from "@/components/preview/preview-shell";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  type PreviewAnswers,
} from "@/lib/preview-intake";

export default function PreviewIntakePage() {
  const [answers, setAnswers] = useState<PreviewAnswers>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(PREVIEW_INTAKE_STORAGE_KEY);
    if (!raw) return;
    try {
      setAnswers(JSON.parse(raw) as PreviewAnswers);
    } catch {
      // ignore malformed local preview state
    }
  }, []);

  const handleChange = (next: PreviewAnswers) => {
    setAnswers(next);
    window.localStorage.setItem(PREVIEW_INTAKE_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Guided intake questionnaire"
        description="Comprehensive intake with industry-specific depth, preselected options, and optional free-form context at each prompt to build stronger platform intelligence."
      />
      <IntakeQuestionnaire initialAnswers={answers} onChange={handleChange} />
    </div>
  );
}
