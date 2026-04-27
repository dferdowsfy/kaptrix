import { COMMERCIAL_PAIN_VALIDATION_SECTION } from "@/lib/intake/sections";
import { sectionToIntakeQuestions } from "@/lib/intake/sections/to-intake-questions";
import {
  buildChunkMetadata,
  partitionAnswers,
  saveSectionResponse,
} from "@/lib/intake/persistence";
import { isFreeFormField } from "@/lib/intake/sections/types";

describe("commercial_pain_validation section config", () => {
  const REQUIRED_FIELDS = [
    "problem_statement",
    "buyer_persona",
    "buyer_persona_notes",
    "pain_severity",
    "pain_frequency",
    "cost_of_pain_categories",
    "cost_of_pain_notes",
    "current_alternative",
    "current_alternative_notes",
    "status_quo_failure",
    "status_quo_failure_notes",
    "customer_demand_evidence",
    "customer_demand_evidence_notes",
    "solution_fit",
    "ai_necessity",
    "ai_necessity_notes",
    "promised_outcome",
    "promised_outcome_notes",
    "outcome_proof",
    "outcome_proof_notes",
    "buying_trigger",
    "buying_trigger_notes",
    "buying_urgency",
    "missing_pain_evidence",
    "missing_pain_evidence_notes",
  ];

  it("uses the canonical section_key, name, and order", () => {
    expect(COMMERCIAL_PAIN_VALIDATION_SECTION.section_key).toBe(
      "commercial_pain_validation",
    );
    expect(COMMERCIAL_PAIN_VALIDATION_SECTION.section_name).toBe(
      "Commercial Pain Validation",
    );
    expect(COMMERCIAL_PAIN_VALIDATION_SECTION.display_order).toBe(1);
  });

  it("declares every required field exactly once", () => {
    const keys = COMMERCIAL_PAIN_VALIDATION_SECTION.fields.map((f) => f.key);
    for (const required of REQUIRED_FIELDS) {
      expect(keys).toContain(required);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("sectionToIntakeQuestions", () => {
  it("emits one IntakeQuestion per field, all under the section name", () => {
    const qs = sectionToIntakeQuestions(COMMERCIAL_PAIN_VALIDATION_SECTION);
    expect(qs).toHaveLength(COMMERCIAL_PAIN_VALIDATION_SECTION.fields.length);
    for (const q of qs) {
      expect(q.section).toBe("Commercial Pain Validation");
      expect(q.id).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("partitionAnswers", () => {
  it("splits structured vs free-form values and ignores empty strings", () => {
    const split = partitionAnswers(COMMERCIAL_PAIN_VALIDATION_SECTION, {
      problem_statement: "  Buyers cannot reconcile invoices fast enough.  ",
      buyer_persona: "Mid-market operator (functional VP / Director)",
      buyer_persona_notes: "",
      pain_severity: 4,
      cost_of_pain_categories: ["Lost revenue / pipeline", "Direct operating cost"],
      ai_necessity_notes: "Rules-based attempts plateaued at 60% accuracy.",
      irrelevant_other_field: "ignored",
    });

    expect(split.raw_text).toEqual({
      problem_statement: "  Buyers cannot reconcile invoices fast enough.  ",
      ai_necessity_notes: "Rules-based attempts plateaued at 60% accuracy.",
    });
    expect(split.structured_answers).toEqual({
      buyer_persona: "Mid-market operator (functional VP / Director)",
      pain_severity: 4,
      cost_of_pain_categories: ["Lost revenue / pipeline", "Direct operating cost"],
    });
  });

  it("drops empty arrays and whitespace-only strings", () => {
    const split = partitionAnswers(COMMERCIAL_PAIN_VALIDATION_SECTION, {
      cost_of_pain_categories: [],
      buyer_persona: "   ",
      problem_statement: "   ",
    });
    expect(split.structured_answers).toEqual({});
    expect(split.raw_text).toEqual({});
  });
});

describe("buildChunkMetadata", () => {
  it("matches the required Phase-1 contract", () => {
    const meta = buildChunkMetadata({
      section: COMMERCIAL_PAIN_VALIDATION_SECTION,
      field_key: "problem_statement",
      field_label: "What problem does the target claim to solve?",
      source_type: "intake",
    });
    expect(meta).toMatchObject({
      source_type: "intake",
      section: "commercial_pain_validation",
      evidence_status: "intake_claim",
      requires_artifact_support: true,
      field_key: "problem_statement",
      field_label: "What problem does the target claim to solve?",
    });
  });
});

describe("isFreeFormField", () => {
  it("flags long_text and short_text fields only", () => {
    const free = COMMERCIAL_PAIN_VALIDATION_SECTION.fields.filter(
      isFreeFormField,
    );
    for (const f of free) {
      expect(["short_text", "long_text"]).toContain(f.type);
    }
    // Every *_notes field is free-form by convention.
    for (const f of free) {
      if (f.key.endsWith("_notes")) {
        expect(f.type).toBe("long_text");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Supabase fake — mimics just enough of the .from(...).upsert/select/delete
// builder chain that saveSectionResponse uses. Tracks every recorded call so
// assertions can verify the chunk metadata and dedup behavior end-to-end.
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function makeFakeSupabase() {
  const tables: Record<string, Row[]> = {
    intake_responses: [],
    kb_chunks: [],
  };
  const log: { table: string; op: string; payload?: unknown }[] = [];

  function from(table: string) {
    const rows = (tables[table] ??= []);
    return {
      upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
        log.push({ table, op: "upsert", payload });
        const list = Array.isArray(payload) ? payload : [payload];
        const conflictKeys = (opts?.onConflict ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const inserted: Row[] = [];
        for (const row of list) {
          const filled: Row = { ...row };
          if (filled.id === undefined) {
            filled.id = `${table}-${tables[table].length + inserted.length + 1}`;
          }
          if (conflictKeys.length > 0) {
            const idx = tables[table].findIndex((existing) =>
              conflictKeys.every((k) => existing[k] === row[k]),
            );
            if (idx >= 0) {
              filled.id = tables[table][idx].id;
              tables[table][idx] = filled;
              inserted.push(filled);
              continue;
            }
          }
          tables[table].push(filled);
          inserted.push(filled);
        }
        return makeSelectable(inserted);
      },
      delete() {
        const filters: { col: string; val: unknown }[] = [];
        const builder = {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return builder;
          },
          then(resolve: (v: { error: null }) => void) {
            tables[table] = rows.filter((row) =>
              filters.some((f) => row[f.col] !== f.val),
            );
            log.push({ table, op: "delete", payload: filters });
            resolve({ error: null });
          },
        };
        return builder;
      },
      select() {
        return {
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    };
  }

  function makeSelectable(rows: Row[]) {
    return {
      select() {
        return {
          single() {
            return Promise.resolve({ data: rows[0] ?? null, error: null });
          },
          then(resolve: (v: { data: Row[]; error: null }) => void) {
            resolve({ data: rows, error: null });
          },
        };
      },
    };
  }

  return {
    from,
    _tables: tables,
    _log: log,
  };
}

describe("saveSectionResponse — end-to-end with fake Supabase", () => {
  it("upserts intake_responses and emits one kb_chunk per free-form field", async () => {
    const fake = makeFakeSupabase();
    // The persistence layer types its argument as SupabaseClient; the
    // surface we touch is small enough that an `as never` cast keeps the
    // test honest without pulling in the real client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await saveSectionResponse(fake as any, COMMERCIAL_PAIN_VALIDATION_SECTION, {
      engagement_id: "preview-demo-001",
      user_id: "00000000-0000-0000-0000-000000000001",
      structured_answers: {
        buyer_persona: "Enterprise buyer (line-of-business SVP / EVP)",
        pain_severity: 5,
        cost_of_pain_categories: ["Lost revenue / pipeline"],
      },
      raw_text: {
        problem_statement: "Manual reconciliation eats 2 FTEs per close.",
        ai_necessity_notes: "Rules-based attempts cap at 60% accuracy.",
      },
    });

    expect(result.intake_response_id).toMatch(/^intake_responses-/);
    expect(result.kb_chunk_ids).toHaveLength(2);

    const responses = fake._tables.intake_responses;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      engagement_id: "preview-demo-001",
      section_key: "commercial_pain_validation",
      source_type: "intake",
    });
    expect((responses[0].structured_answers as Row).pain_severity).toBe(5);

    const chunks = fake._tables.kb_chunks;
    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect((chunk.metadata as Row).source_type).toBe("intake");
      expect((chunk.metadata as Row).section).toBe("commercial_pain_validation");
      expect((chunk.metadata as Row).evidence_status).toBe("intake_claim");
      expect((chunk.metadata as Row).requires_artifact_support).toBe(true);
      expect(chunk.intake_response_id).toBe(result.intake_response_id);
    }
  });

  it("clears stale chunks when a free-form field is emptied on re-save", async () => {
    const fake = makeFakeSupabase();
    const args = {
      engagement_id: "preview-demo-002",
      user_id: "00000000-0000-0000-0000-000000000002",
      structured_answers: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveSectionResponse(fake as any, COMMERCIAL_PAIN_VALIDATION_SECTION, {
      ...args,
      raw_text: {
        problem_statement: "Original claim.",
        ai_necessity_notes: "Original notes.",
      },
    });
    expect(fake._tables.kb_chunks).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveSectionResponse(fake as any, COMMERCIAL_PAIN_VALIDATION_SECTION, {
      ...args,
      raw_text: {
        problem_statement: "Updated claim.",
        // ai_necessity_notes intentionally cleared
      },
    });
    expect(fake._tables.kb_chunks).toHaveLength(1);
    expect(fake._tables.kb_chunks[0].field_key).toBe("problem_statement");
    expect(fake._tables.kb_chunks[0].content).toBe("Updated claim.");
  });
});
