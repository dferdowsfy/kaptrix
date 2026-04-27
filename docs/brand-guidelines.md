# Kaptrix Brand Guidelines

For external use — including arcade.software's video generation tooling.

---

## 1. Brand essence

**Name.** Kaptrix. Always written as a single word. All caps for the wordmark
(`KAPTRIX`); title case in body copy ("Kaptrix").

**One-liner.** Institutional-grade AI diligence — not summaries, not
demos, not vibes.

**What we are.** An AI diligence and risk qualification platform that
turns uploaded artifacts, intake responses, and evidence-backed scoring
into investment-grade outputs.

**What we are not.**
- Not a chatbot.
- Not a "deal copilot."
- Not an LLM-summary wrapper.
- Not a "vibes-based AI score."

**Audience.**
- Private equity (growth, mid-market, large-cap).
- Investment Committee chairs and partners.
- Corporate development.
- Portfolio operators running post-close diligence.
- AI-product founders preparing for diligence.

**Reader.** A senior decision-maker who has 20 minutes, has seen every
"we built an AI thing" deck, and will underwrite or kill the deal based
on whether the evidence is real.

---

## 2. Voice & tone

### Voice attributes

| Trait | What it means | What it doesn't |
|---|---|---|
| **Direct** | Lead with the finding. State the call. | Lead with methodology. "In this section we will..." |
| **Evidence-first** | Every claim has a citation, an artifact, or an explicit gap. | "Inferred from the company's positioning..." |
| **Operator** | Sounds like someone who has shipped production AI. | Sounds like a McKinsey associate. |
| **Calibrated** | Low / medium / high confidence on every claim. | Hedge words without numbers. |
| **Compact** | Dense paragraphs, short bullets. No filler. | Long ramps. "It is important to note..." |
| **Adversarial** | Stress-test claims. Assume weakness unless disproven. | Balance every risk with a rhetorical strength. |

### Tone calibration

- **Top of funnel (web hero, video opener):** confident, slightly contrarian, plain-spoken. Three to seven words per sentence is fine.
- **Mid-funnel (feature pages, case studies):** still direct, but quantify. "We close 12 hours of analyst time per deal" beats "We accelerate diligence."
- **Product UI:** functional and unembellished. Buttons say what they do.
- **IC-grade output (the deliverable):** dense, sourced, decisive. Every sentence drives toward a vote.

### Forbidden phrases

These never appear in Kaptrix-branded copy:

- "Revolutionary," "game-changing," "transform your workflow"
- "Unlock the power of AI"
- "AI-powered" as a standalone modifier (always pair with what it does)
- "May," "could," "potential" used without a quantified magnitude
- "To determine," "we analyzed," "this suggests," "outlines," "covers"
- "Loss of customer trust," "loss of revenue, customer dissatisfaction"
- "Implement X, update Y" (generic, no owner, no measurable outcome)
- "Enhance governance," "strengthen posture" without a named control

### Sample copy

**Hero (web/video):**
> The IC asks one question: is this real?
> Kaptrix answers it with evidence, not summaries.

**Subhead:**
> Three independent scores. One canonical evidence trail. No hallucinations dressed as analysis.

**Feature line — Commercial Pain Confidence:**
> Score the commercial reality before you score the AI. 0 to 100. Deterministic. Separate from technical diligence.

**Feature line — AI Diligence Score:**
> Six dimensions. Twenty-four sub-criteria. Every score citing the artifact that earns it — or the gap that caps it.

**Feature line — Evidence Coverage Confidence:**
> A score on your diligence itself. Because "we asked them" is not the same as "we audited it."

**Closer:**
> Underwrite the deal you can defend. Not the deck you got sold.

---

## 3. Visual identity

### Color palette

The palette is dark, technical, and decisive. Light surfaces only for content. Use status colors only for status, not decoration.

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Primary background (deepest)** | `kaptrix-ink` | `#0A0B1F` | Hero backgrounds, video bumpers, reversed type |
| **Primary background (mid)** | `kaptrix-navy` | `#1B1F4A` | Gradient stop, card chrome on dark |
| **Primary brand accent** | `kaptrix-indigo` | `#4F46E5` | CTAs, primary links, brand highlights |
| **Secondary accent** | `kaptrix-violet` | `#6B5BFF` | Hyperlinks in email, secondary highlights |
| **Soft accent** | `kaptrix-fuchsia` | `#D946EF` | One-color-pop moments only — gradients sparingly |
| **Surface (light)** | `kaptrix-bone` | `#F4F4F7` | Light page backgrounds |
| **Surface (white)** | `kaptrix-paper` | `#FFFFFF` | Cards, content blocks |
| **Body text** | `kaptrix-graphite` | `#3F3F50` | Primary body type on light surfaces |
| **Muted text** | `kaptrix-mist` | `#6B7280` | Captions, helper, metadata |
| **Hairline** | `kaptrix-rule` | `#E5E7EB` | Borders, dividers |

**Status colors** — used in scoring UI and report tags. Not decorative.

| Tone | Hex | Meaning |
|---|---|---|
| Strong / positive | `#10B981` (emerald 500) | "Strong," "Invest," "Validated" |
| Caution / pending | `#D97706` (amber 600) | "Moderate," "Pending," "Conditional" |
| Weak / risk | `#E11D48` (rose 600) | "Weak," "Do Not Proceed," "Critical" |
| Neutral / insufficient | `#6B7280` (slate 500) | "Insufficient," "Not yet computed" |

### Signature gradient

Used on hero blocks, video bumpers, and the email header.

```
linear-gradient(135deg, #1B1F4A 0%, #0D1033 50%, #0A0B1F 100%)
```

Always 135°, always those three stops, always dark. Do not use the
gradient on text. Do not invert it for "light hero" variants.

### Typography

**Stack** (system-first, no web font dependency):
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

**Hierarchy** (web, video lower-thirds, deck templates):

| Use | Weight | Tracking | Notes |
|---|---|---|---|
| Wordmark `KAPTRIX` | 900 | `0.22em` | Always uppercase, always tight |
| Display | 700 | `-0.02em` | Hero, video titles |
| Heading | 700 | normal | Section headers |
| Body | 400 | normal | Long-form |
| Eyebrow / category | 600 | `0.18em` uppercase | Section labels — small caps feeling |
| Numerics | 700, `font-feature-settings: "tnum"` | normal | Always tabular for scores |

Numbers get tabular figures everywhere. `4.1 / 5.0` lines up with `4.3 / 5.0` exactly.

### Logo usage

- The wordmark is `KAPTRIX` in 900 weight, all caps, `0.22em` letter-spacing.
- Optional logomark (email header): a 32×32 rounded square (8px radius) with a single-color glyph. White on the dark gradient, dark on white surfaces.
- Minimum clear space around the wordmark: the height of one capital letter on each side.
- Do not stretch, recolor, italicize, or place over photographs.

### Imagery

- Abstract geometric, low-saturation, asymmetric.
- No stock photos of people in suits pointing at screens.
- No "AI brain" imagery. No glowing neural networks.
- Charts, dashboards, and screenshots of the actual product are preferred over illustration.
- When illustration is used: single-stroke geometry, brand purple/indigo on dark, sparse.

---

## 4. Messaging pillars

Three things. Every piece of marketing should ladder to one of these.

### Pillar 1 — Evidence over vibes

**Promise.** Every score, every claim, every recommendation is tied to a specific artifact or an explicit named gap.

**Proof points.** Source-mix tags (artifact-supported / artifact-only / intake-only / contradictory / insufficient). Per-criterion confidence levels. Zero "inferred from the company's positioning..."

### Pillar 2 — Three independent lenses

**Promise.** Commercial reality, technical credibility, and evidence coverage are scored separately. They are never collapsed into a single number.

**Proof points.** Commercial Pain Confidence (0–100), AI Diligence Score (0–5 across six dimensions), Evidence Coverage Confidence. The four-quadrant interpretation: Strong Signal / Execution Risk / Commercially Weak / Likely Pass.

### Pillar 3 — IC-ready output

**Promise.** What comes out of Kaptrix can be put in front of a partner without a junior associate cleaning it up.

**Proof points.** Decision Snapshot blocks at the top of every report. Final Position blocks at the bottom. Quantified risk × likelihood × business impact tables. Named owners and days-to-close on every condition.

---

## 5. Product/sales video — narrative arc

This is the script the video should land. Specific beats, in order.

**Beat 1 — The problem (0:00–0:08).**
> "Most AI diligence is a deck. The IC reads it. They have one question: is this real?"

**Beat 2 — The fracture (0:08–0:20).**
> "Founders pitch. Analysts summarize. The model fills in the gaps. By the time it hits the partner, no one can point to the artifact that proves the claim. So the IC asks for more. The deal slips. Or worse — it doesn't, and you find out post-close."

**Beat 3 — The Kaptrix difference (0:20–0:45).**
> "Kaptrix scores three things separately. Commercial pain. AI diligence. Evidence coverage. Every score traces back to an uploaded artifact, or to the named gap that capped it. No 'inferred from the company's positioning.' No hedged 'this suggests.' Just artifacts, scores, and a verdict you can defend."

**Beat 4 — The product reveal (0:45–1:15).**
Show the scoring page in action — the Decision Snapshot hero, three score cards, manual override sliders, the live floating composite. Voiceover names what's on screen, in the brand voice — no "as you can see, we have..."

**Beat 5 — The output (1:15–1:35).**
Cut to a generated IC memo. Camera pans across:
- Decision Snapshot block (verdict, confidence, thesis, risks).
- Critical Risks table with named owners.
- Final Position block.

> "This is not a summary. It's a memo your IC can vote on."

**Beat 6 — The close (1:35–1:45).**
> "Underwrite the deal you can defend. Kaptrix.com."

### Supporting taglines (for video lower-thirds and CTAs)

- "Evidence over vibes."
- "Three lenses. One verdict."
- "Diligence the IC will actually read."
- "Every score earns its citation."
- "Score the diligence, not just the deal."

### CTA hierarchy

Primary CTA in any video: `kaptrix.com` or `kaptrix.com/demo`. Never "Book a meeting" — sounds like every other SaaS.

---

## 6. Do / don't

### Do

- Quantify magnitude. "12 hours per deal." "40 ARR-bps margin compression." Not "significantly faster."
- Name the artifact. "MSA §3.2," "SOC 2 Type II observation window dates," "usage report Q1 2026."
- Distinguish intake claims from artifact-backed evidence. Always.
- Use the brand colors for status meaning (green/amber/rose). Never use them as decoration.
- Show product UI directly. The scoring page, the IC memo, the report.

### Don't

- Don't use the word "AI" as a standalone selling point. AI is the medium, not the product.
- Don't anthropomorphize the platform ("Kaptrix thinks," "Kaptrix learns"). It calculates and grounds.
- Don't make the score look like ChatGPT output. The deterministic engine produces the same score every time from the same inputs. That's a feature.
- Don't use stock imagery, glowing brain visuals, or "neural network" backdrops.
- Don't claim Kaptrix is investment advice. Footer: "Not investment advice. Engagements are governed by individual letters of engagement."
- Don't write hero copy that could appear on any AI startup's site. If a Notion AI ad could swap places with the Kaptrix copy, the copy is wrong.

---

## 7. Legal & disclosure

These lines must appear in any video output, deck, or report:

- "Not investment advice."
- "Engagements are governed by individual letters of engagement."
- (Where applicable) "LLM augmentation — adjust as needed."

---

## 8. Quick-reference summary for video tooling

If the video tool only ingests a short config block:

```
brand_name: Kaptrix
wordmark: KAPTRIX (uppercase, weight 900, letter-spacing 0.22em)
primary_dark: #0A0B1F
primary_navy: #1B1F4A
brand_indigo: #4F46E5
brand_violet: #6B5BFF
status_strong: #10B981
status_caution: #D97706
status_weak: #E11D48
font_stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
voice: direct, evidence-first, operator, calibrated, compact, adversarial
forbidden: revolutionary, game-changing, AI-powered, may, could, potential, transform your workflow, unlock the power of AI
tagline_options:
  - "Evidence over vibes."
  - "Three lenses. One verdict."
  - "Diligence the IC will actually read."
  - "Every score earns its citation."
cta: kaptrix.com
disclaimer: "Not investment advice. Engagements are governed by individual letters of engagement."
```
