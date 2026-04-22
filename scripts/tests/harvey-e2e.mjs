#!/usr/bin/env node
/**
 * Kaptrix Harvey E2E regression harness
 * ------------------------------------------------------------------
 * Exercises the Kaptrix platform end-to-end against a synthetic
 * "Harvey" (legal AI copilot) knowledge base. Hits the live dev
 * server and the real LLM providers wired via OPENROUTER_MODEL_*
 * / SELF_HOSTED_LLM_* envs.
 *
 * Run:      npm run test:harvey
 * Env:
 *   KAPTRIX_BASE_URL               default http://localhost:3000
 *   NEXT_PUBLIC_SUPABASE_URL       read from .env.local
 *   SUPABASE_SERVICE_ROLE_KEY      optional — enables auth-gated steps
 *   KAPTRIX_TEST_USER_EMAIL        optional — existing confirmed user
 *                                  to sign in as (pairs with password)
 *   KAPTRIX_TEST_USER_PASSWORD     optional — used with the email above
 *
 * Output:
 *   tests/results/harvey-e2e-<timestamp>.json
 *   Prints a pass/fail table; exits 0 on all pass, 1 on any fail.
 * ------------------------------------------------------------------
 */

import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ──────────────────────────────────────────────────────────────────
// Load .env.local (no deps — tiny inline parser)
// ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function loadDotenv(file) {
  try {
    const raw = await readFile(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      if (process.env[m[1]]) continue; // do not overwrite
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  } catch {
    /* no .env.local — fine */
  }
}
await loadDotenv(path.join(REPO_ROOT, ".env.local"));
await loadDotenv(path.join(REPO_ROOT, ".env"));

// ──────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.KAPTRIX_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const FIXTURE_DIR = path.join(REPO_ROOT, "tests", "fixtures", "harvey");
const RESULTS_DIR = path.join(REPO_ROOT, "tests", "results");
const HARVEY_CLIENT_ID = "preview-harvey-001";
const SESSION_ID = `harvey-e2e-${Date.now()}`;

// Synthetic Harvey knowledge base. Deliberately specific so we can
// assert LLM outputs are grounded (mention Harvey, contracts, BigLaw,
// etc.) rather than generic boilerplate.
const HARVEY_KB = `
ENGAGEMENT: target=Harvey, client=Kaptrix Internal QA, deal_stage=confirmatory, tier=premium.
INDUSTRY: Legal Tech / AI assistants for elite law firms (BigLaw).

[intake] Harvey is an AI copilot for lawyers. Core workflows: contract review, due diligence research, litigation drafting, legal research, memo drafting. Customers are large law firms (Allen & Overy, PwC legal, Paul Weiss) and in-house legal teams.
[intake] Product is built on top of OpenAI GPT-4-class models via Microsoft Azure OpenAI, with a retrieval layer over firm document stores and public legal corpora.
[intake] Named competitors cited by operator: Hebbia, Robin AI, Spellbook, Ironclad AI, Casetext / CoCounsel (Thomson Reuters).
[intake] ARR ~ $50M (2024), growth > 3x YoY. Headcount ~250.
[intake] Data sensitivity: matter-privileged, client-confidential text; cross-border concerns (UK/EU clients).

[insight · commercial] Paul Weiss rollout and Allen & Overy expansion indicate strong BigLaw distribution; switching cost is workflow-embedding + firm knowledge graph.
[insight · technical] Heavy dependency on Azure OpenAI (GPT-4o / GPT-4-turbo) — model concentration risk if pricing or policy shifts.
[insight · regulatory] EU AI Act "high-risk" categorisation plausible for litigation drafting; firm-side DPA obligations around training data provenance.
[insight · operational] Retrieval grounding over firm corpora is the claimed differentiator — quality depends on ingestion pipeline and per-matter isolation.
[insight · financial] Premium per-seat pricing (~$100+ / seat / mo) supported by BigLaw billable-hour economics.

[red flag · tooling_exposure] Single-vendor LLM dependency (Azure OpenAI) with no public statement on secondary providers — concentration + pricing exposure.
[red flag · data_sensitivity] Handling of cross-client privileged text requires demonstrable tenant/matter isolation; public documentation limited.
[red flag · governance_safety] Hallucination risk on legal citations (post-Mata v. Avianca risk); operator audit trails must be firm-auditable.
[red flag · open_validation] Revenue quality (committed vs pilot) and churn by firm segment not independently verifiable from public evidence.

[finding · medium] Product is clearly AI-core, not a wrapper: retrieval + firm-specific fine-tunes produce outputs distinct from vanilla GPT-4.
[finding · medium] Harvey's moat is workflow embedding inside BigLaw + firm knowledge graph; pure model parity does not displace it.
[finding · high] Model-vendor concentration remains the dominant technical risk; contractual fallbacks are not publicly disclosed.

[score · product_credibility/ai_value_vs_wrapper] 4.0 — AI is central to the value proposition.
[score · tooling_exposure/model_concentration] 2.0 — Heavy Azure OpenAI dependency.
[score · data_sensitivity/customer_isolation] 3.0 — Per-firm tenancy claimed; public evidence limited.
[score · governance_safety/output_risk] 2.5 — Hallucinated citations remain a live risk in legal drafting.
[score · production_readiness/scaling] 3.5 — Scaled to dozens of BigLaw deployments; operational stability seems adequate.
[score · open_validation/customer_vs_claimed] 3.0 — Named logos verifiable; revenue quality not independently confirmable.

[document] harvey-overview.pdf (commercial, status: parsed)
[document] harvey-architecture.pptx (technical, status: parsed)
[document] harvey-security.docx (regulatory, status: parsed)
[document] harvey-screenshot.png (operational, status: parsed)
`.trim();

// ──────────────────────────────────────────────────────────────────
// Result accumulator
// ──────────────────────────────────────────────────────────────────
const results = [];
function record(step, name, status, details = {}) {
  const row = { step, name, status, ...details };
  results.push(row);
  const tag =
    status === "PASS" ? "\x1b[32mPASS\x1b[0m"
    : status === "FAIL" ? "\x1b[31mFAIL\x1b[0m"
    : "\x1b[33mSKIP\x1b[0m";
  const extra = details.reason || details.error || "";
  console.log(`  [${tag}] ${step} · ${name}${extra ? ` — ${extra}` : ""}`);
}

// ──────────────────────────────────────────────────────────────────
// HTTP helpers
// ──────────────────────────────────────────────────────────────────
async function httpJson(method, pathname, { body, headers, timeoutMs = 300_000 } = {}) {
  const url = `${BASE_URL}${pathname}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(headers || {}),
      },
      body: body == null ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, body: json, raw: text };
  } finally {
    clearTimeout(timer);
  }
}

async function httpMultipart(pathname, form, { headers, timeoutMs = 300_000 } = {}) {
  const url = `${BASE_URL}${pathname}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...(headers || {}) },
      body: form,
      signal: ctl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, body: json, raw: text };
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────────────────────────────────────────────────────────
// Supabase helpers (service role — optional)
// ──────────────────────────────────────────────────────────────────
function hasServiceRole() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function loadSupabaseClients() {
  if (!hasServiceRole()) return null;
  try {
    const mod = await import("@supabase/supabase-js");
    const createClient = mod.createClient;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { createClient, service };
  } catch (e) {
    console.warn("  (supabase-js not loadable:", e.message, ")");
    return null;
  }
}

/**
 * Try to sign in as the test user via password and return cookie header
 * matching the @supabase/ssr format. Best-effort — if it fails we just
 * run unauthenticated and skip auth-required steps.
 */
async function tryAuthCookie(clients) {
  const email = process.env.KAPTRIX_TEST_USER_EMAIL;
  const password = process.env.KAPTRIX_TEST_USER_PASSWORD;
  if (!clients || !email || !password) return null;
  try {
    const anonClient = clients.createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
    if (error || !data?.session) return null;
    const s = data.session;
    // @supabase/ssr cookie name pattern: sb-<project-ref>-auth-token
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
    const cookieName = `sb-${projectRef}-auth-token`;
    const payload = JSON.stringify({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
      expires_in: s.expires_in,
      token_type: s.token_type,
      user: s.user,
    });
    const cookieValue = `base64-${Buffer.from(payload).toString("base64")}`;
    return { header: `${cookieName}=${cookieValue}`, userId: s.user.id };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Preflight
// ──────────────────────────────────────────────────────────────────
async function preflight() {
  console.log(`\n▶ Kaptrix Harvey E2E — base ${BASE_URL}\n`);
  try {
    const res = await fetch(BASE_URL, { method: "GET" });
    if (!res.ok && res.status !== 404) {
      console.error(`Preflight: server responded ${res.status}`);
    }
    console.log(`  preflight: server reachable (${res.status})`);
  } catch (e) {
    console.error(`\n✖ Dev server not reachable at ${BASE_URL}.`);
    console.error(`  Start it with \`npm run dev\` in another terminal, then retry.\n`);
    process.exit(2);
  }
  const provider = process.env.OPENROUTER_API_KEY
    ? "openrouter"
    : process.env.SELF_HOSTED_LLM_BASE_URL
    ? "self_hosted"
    : "none";
  console.log(`  LLM provider: ${provider}`);
  if (provider === "none") {
    console.error(`\n✖ No LLM provider configured. Set OPENROUTER_API_KEY or SELF_HOSTED_LLM_BASE_URL.\n`);
    process.exit(2);
  }
}

// ──────────────────────────────────────────────────────────────────
// Assertions
// ──────────────────────────────────────────────────────────────────
function mentionsHarvey(text) {
  if (!text || typeof text !== "string") return false;
  return /harvey|legal|contract|biglaw|law firm|litigation/i.test(text);
}

function looksGeneric(text) {
  if (!text) return true;
  const t = text.toLowerCase();
  // Refuse empty / boilerplate
  if (t.length < 30) return true;
  if (/\b(unable to assess|not enough information|insufficient evidence)\b/.test(t) &&
      t.length < 200) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────
// Step 1: Intake + Chat
// ──────────────────────────────────────────────────────────────────
async function step1_intakeChat(authCookie) {
  const prompts = [
    "What does Harvey do and who are its customers?",
    "How does Harvey use AI in its product?",
    "What is Harvey's biggest technical dependency?",
  ];
  let grounded = 0;
  const headers = authCookie ? { cookie: authCookie.header } : {};
  for (const q of prompts) {
    const res = await httpJson("POST", "/api/chat", {
      body: {
        question: q,
        knowledge_base: HARVEY_KB,
        session_id: SESSION_ID,
        client_id: HARVEY_CLIENT_ID,
      },
      headers,
      timeoutMs: 180_000,
    });
    if (!res.ok || !res.body?.answer) {
      record("1", `intake-chat: "${q}"`, "FAIL",
        { error: `HTTP ${res.status} ${res.body?.error || res.raw?.slice(0, 120)}` });
      continue;
    }
    const ans = String(res.body.answer);
    const ok = mentionsHarvey(ans) && !looksGeneric(ans);
    if (ok) grounded++;
    record("1", `intake-chat grounded: "${q}"`, ok ? "PASS" : "FAIL",
      { answer_preview: ans.slice(0, 140) });
  }
  return { grounded, total: prompts.length };
}

// ──────────────────────────────────────────────────────────────────
// Step 2: Evidence Upload & Coverage
// ──────────────────────────────────────────────────────────────────
async function fixtureExists(name) {
  try {
    await access(path.join(FIXTURE_DIR, name), FS.F_OK);
    return true;
  } catch { return false; }
}

async function step2_evidenceUpload(authCookie) {
  const types = [
    { file: "harvey-overview.pdf",      category: "commercial"  },
    { file: "harvey-architecture.pptx", category: "technical"   },
    { file: "harvey-security.docx",     category: "regulatory"  },
    { file: "harvey-screenshot.png",    category: "operational" },
  ];
  if (!authCookie) {
    for (const t of types) {
      record("2", `upload/parse ${t.file}`, "SKIP",
        { reason: "auth required (set KAPTRIX_TEST_USER_EMAIL/PASSWORD)" });
    }
    return { parsed: 0, total: types.length };
  }
  let parsed = 0;
  for (const t of types) {
    if (!(await fixtureExists(t.file))) {
      record("2", `upload/parse ${t.file}`, "SKIP", { reason: "fixture missing" });
      continue;
    }
    const buf = await readFile(path.join(FIXTURE_DIR, t.file));
    const form = new FormData();
    form.append("file", new Blob([buf]), t.file);
    const res = await httpMultipart("/api/preview/parse", form,
      { headers: { cookie: authCookie.header }, timeoutMs: 180_000 });
    const hasText = res.ok && typeof res.body?.text === "string" && res.body.text.length > 0;
    if (hasText) parsed++;
    record("2", `upload/parse ${t.file}`, hasText ? "PASS" : "FAIL",
      { status: res.status, text_len: res.body?.text?.length ?? 0,
        error: hasText ? undefined : (res.body?.error || res.raw?.slice(0, 120)) });
  }
  return { parsed, total: types.length };
}

// ──────────────────────────────────────────────────────────────────
// Step 3: Scoring — 6 dimensions
// ──────────────────────────────────────────────────────────────────
const EXPECTED_DIMS = [
  "product_credibility",
  "tooling_exposure",
  "data_sensitivity",
  "governance_safety",
  "production_readiness",
  "open_validation",
];

async function step3_scoring(authCookie, labelPrefix = "3") {
  const headers = authCookie ? { cookie: authCookie.header } : {};
  const res = await httpJson("POST", "/api/scores/suggest", {
    body: { knowledge_base: HARVEY_KB },
    headers,
    timeoutMs: 600_000,
  });
  if (!res.ok || !Array.isArray(res.body?.scores)) {
    record(labelPrefix, "scoring fan-out", "FAIL",
      { error: `HTTP ${res.status} ${res.body?.error || res.raw?.slice(0, 160)}` });
    return { dimsCovered: 0, total: EXPECTED_DIMS.length, scores: [] };
  }
  const scores = res.body.scores;
  const byDim = new Map();
  for (const s of scores) {
    if (!byDim.has(s.dimension)) byDim.set(s.dimension, []);
    byDim.get(s.dimension).push(s);
  }
  let dimsCovered = 0;
  for (const dim of EXPECTED_DIMS) {
    const ss = byDim.get(dim) || [];
    if (ss.length === 0) {
      record(labelPrefix, `scoring · ${dim}`, "FAIL", { reason: "no scores returned" });
      continue;
    }
    const hasRationale = ss.every(s =>
      typeof s.rationale === "string" && s.rationale.trim().length >= 10,
    );
    const hasNumeric = ss.every(s =>
      typeof s.score_0_to_5 === "number" && s.score_0_to_5 >= 0 && s.score_0_to_5 <= 5,
    );
    const allInsufficient = ss.every(s =>
      /insufficient evidence/i.test(s.rationale || ""),
    );
    const anyFailed = ss.some(s =>
      /score generation failed/i.test(s.rationale || ""),
    );
    const pass = hasRationale && hasNumeric && !allInsufficient && !anyFailed;
    if (pass) dimsCovered++;
    record(labelPrefix, `scoring · ${dim}`, pass ? "PASS" : "FAIL", {
      sub_count: ss.length,
      rationale_preview: ss[0]?.rationale?.slice(0, 140),
      reason: pass ? undefined :
        (!hasRationale ? "rationales too short"
          : !hasNumeric ? "invalid scores"
          : anyFailed ? "server returned 'Score generation failed' fallback — LLM error"
          : "all sub-criteria returned insufficient evidence"),
    });
  }
  return { dimsCovered, total: EXPECTED_DIMS.length, scores };
}

// ──────────────────────────────────────────────────────────────────
// Step 4: Positioning
// ──────────────────────────────────────────────────────────────────
async function step4_positioning(authCookie) {
  const headers = authCookie ? { cookie: authCookie.header } : {};
  // One retry on 5xx — positioning LLM JSON parse is the noisiest path.
  let res = await httpJson("POST", "/api/positioning", {
    body: { client_id: HARVEY_CLIENT_ID, knowledge_base: HARVEY_KB },
    headers,
    timeoutMs: 600_000,
  });
  if (!res.ok && res.status >= 500) {
    res = await httpJson("POST", "/api/positioning", {
      body: { client_id: HARVEY_CLIENT_ID, knowledge_base: HARVEY_KB },
      headers,
      timeoutMs: 600_000,
    });
  }
  if (!res.ok || !res.body) {
    record("4", "positioning request", "FAIL",
      { error: `HTTP ${res.status} ${res.body?.error || res.raw?.slice(0, 160)}` });
    return;
  }
  // Server wraps the result in { positioning: {...} }. Fall back to
  // top-level for older shapes.
  const b = res.body.positioning ?? res.body;
  const peers = Array.isArray(b.comparables) ? b.comparables : [];
  const peerNames = peers.map(p => String(p.name || "").toLowerCase());
  const KNOWN_LEGAL_PEERS = [
    "hebbia", "robin ai", "spellbook", "ironclad", "casetext",
    "cocounsel", "thomson reuters", "lexis", "westlaw", "everlaw",
    "relativity", "luminance", "kira", "evisort", "lawgeex",
  ];
  const hasPeer = peerNames.length >= 2 &&
    peerNames.some(n => KNOWN_LEGAL_PEERS.some(k => n.includes(k)));
  const hasGeneric = peerNames.some(n =>
    /other ai|generic|ai tool|ai platform|example/i.test(n));
  record("4", "positioning returns real legal-tech peers",
    hasPeer && !hasGeneric ? "PASS" : "FAIL", {
      peers: peerNames.slice(0, 8),
      reason: !hasPeer ? "no recognized legal-tech peers in output"
            : hasGeneric ? "output contains generic peer placeholders"
            : undefined,
    });
  record("4", "positioning includes summary & confidence",
    typeof b.positioning_summary === "string" && b.positioning_summary.length > 20 &&
    typeof b.confidence === "string"
      ? "PASS" : "FAIL", {
      summary_preview: String(b.positioning_summary || "").slice(0, 140),
      confidence: b.confidence,
    });
}

// ──────────────────────────────────────────────────────────────────
// Step 5: Report Generation (requires DB-backed engagement + all scores)
// ──────────────────────────────────────────────────────────────────
async function step5_reports(authCookie) {
  if (!authCookie) {
    record("5", "report generation", "SKIP",
      { reason: "auth + DB-backed engagement required" });
    return;
  }
  // Full report generation requires a DB engagement with 24 saved scores.
  // Seeding + scoring is out of scope for a standalone harness; we exercise
  // the endpoint surface only.
  const res = await httpJson("POST", "/api/reports/generate", {
    body: { engagement_id: HARVEY_CLIENT_ID, watermark: "harvey-e2e" },
    headers: { cookie: authCookie.header },
    timeoutMs: 300_000,
  });
  // Accept either success OR an expected precondition error (engagement
  // not found / not fully scored). Both prove the route is wired up and
  // auth is working — full report requires a real seeded engagement.
  const expectedGuard = res.status === 400 || res.status === 404;
  record("5", "report endpoint reachable (auth + precondition)",
    res.ok || expectedGuard ? "PASS" : "FAIL", {
      status: res.status,
      body_preview: String(res.body?.error || res.raw || "").slice(0, 160),
    });
}

// ──────────────────────────────────────────────────────────────────
// Step 6: Chat regression — 5 varied questions
// ──────────────────────────────────────────────────────────────────
async function step6_chatRegression(authCookie) {
  const cases = [
    { q: "What does Harvey do?",                 kind: "factual",     expect: mentionsHarvey },
    { q: "What is the biggest risk in this deal?", kind: "evaluative", expect: (t) => /risk|concentration|depend|azure|openai|hallucinat|governance/i.test(t) },
    { q: "Where did you get the Azure OpenAI dependency claim?", kind: "evidence", expect: (t) => /insight|red flag|evidence|document|intake|knowledge base|azure/i.test(t) },
    { q: "Is Harvey overvalued?",                kind: "adversarial", expect: (t) => /depends|cannot determine|not enough|context|without|unclear|insufficient|valuation|multiple|arr/i.test(t) },
    { q: "What is the weather in Paris today?", kind: "out-of-scope", expect: (t) => /cannot|unable|not .*able|outside|scope|can't|don'?t have|do not have|out of scope|does not contain|no information|no .* information|evidence does not|provided evidence|not .* available|sorry|apolog/i.test(t) },
  ];
  const headers = authCookie ? { cookie: authCookie.header } : {};
  for (const c of cases) {
    const res = await httpJson("POST", "/api/chat", {
      body: { question: c.q, knowledge_base: HARVEY_KB,
              session_id: SESSION_ID, client_id: HARVEY_CLIENT_ID },
      headers,
      timeoutMs: 180_000,
    });
    if (!res.ok || !res.body?.answer) {
      record("6", `chat regression · ${c.kind}`, "FAIL",
        { error: `HTTP ${res.status} ${res.body?.error || res.raw?.slice(0, 120)}` });
      continue;
    }
    const ans = String(res.body.answer);
    const ok = c.expect(ans) && !looksGeneric(ans);
    record("6", `chat regression · ${c.kind}`, ok ? "PASS" : "FAIL",
      { q: c.q, answer_preview: ans.slice(0, 140) });
  }
}

// ──────────────────────────────────────────────────────────────────
// Step 7: KB continuous loop — re-run scoring and assert consistency
// ──────────────────────────────────────────────────────────────────
async function step7_kbLoop(authCookie, firstScores) {
  const second = await step3_scoring(authCookie, "7");
  const firstDims = new Set((firstScores || []).map(s => s.dimension));
  const secondDims = new Set(second.scores.map(s => s.dimension));
  const sameCoverage =
    firstDims.size === secondDims.size &&
    [...firstDims].every(d => secondDims.has(d));
  record("7", "KB loop: scoring re-run preserves dimension coverage",
    sameCoverage ? "PASS" : "FAIL", {
      first_dims: [...firstDims],
      second_dims: [...secondDims],
    });
  // Spot-check that rationales still cite concrete evidence (not cached).
  const hasEvidence = second.scores.some(s =>
    /harvey|azure|openai|legal|law firm|biglaw|contract|litigation|privileg|vendor|model|workflow/i.test(s.rationale || ""),
  );
  record("7", "KB loop: rationales still reference Harvey evidence",
    hasEvidence ? "PASS" : "FAIL");
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
  await preflight();

  const clients = await loadSupabaseClients();
  const authCookie = await tryAuthCookie(clients);
  if (authCookie) {
    console.log(`  auth: signed in as test user (${authCookie.userId.slice(0, 8)}…)`);
  } else {
    console.log(`  auth: anonymous (auth-gated steps will be skipped)`);
  }
  console.log("");

  console.log("━ Step 1 — Intake + Chat");
  await step1_intakeChat(authCookie);

  console.log("\n━ Step 2 — Evidence Upload & Coverage");
  await step2_evidenceUpload(authCookie);

  console.log("\n━ Step 3 — Scoring (6 dimensions)");
  const first = await step3_scoring(authCookie, "3");

  console.log("\n━ Step 4 — Positioning");
  await step4_positioning(authCookie);

  console.log("\n━ Step 5 — Report Generation");
  await step5_reports(authCookie);

  console.log("\n━ Step 6 — Chat Assistant Regression");
  await step6_chatRegression(authCookie);

  console.log("\n━ Step 7 — KB Continuous Loop");
  await step7_kbLoop(authCookie, first.scores);

  // ── Summary ────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  console.log("\n━ Summary");
  console.log(`  PASS: ${passed}`);
  console.log(`  FAIL: ${failed}`);
  console.log(`  SKIP: ${skipped}`);

  await mkdir(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(RESULTS_DIR, `harvey-e2e-${stamp}.json`);
  await writeFile(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    authenticated: Boolean(authCookie),
    summary: { pass: passed, fail: failed, skip: skipped },
    results,
  }, null, 2));
  console.log(`\n  results → ${path.relative(REPO_ROOT, outPath)}`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n✖ Uncaught error in harness:", err);
  process.exit(2);
});
