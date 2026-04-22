# Harvey E2E Fixtures

Optional evidence files consumed by `scripts/tests/harvey-e2e.mjs` (npm run `test:harvey`).

The harness will upload one of each type when present:

- `harvey-overview.pdf` — product / company overview
- `harvey-architecture.pptx` — system / architecture deck
- `harvey-security.docx` — security & compliance writeup
- `harvey-screenshot.png` — product screenshot (exercises vision/OCR path)

If a fixture is missing the upload/coverage step for that file type is
recorded as SKIPPED (not a failure). Drop the actual files into this
directory to exercise the full parser stack.

The script also uses an inline, synthetic Harvey knowledge base
(legal AI copilot: contract review, due diligence research, litigation
drafting) for deterministic grounding checks against the scoring,
positioning, and chat endpoints — so all non-upload steps run without
any fixtures present.
