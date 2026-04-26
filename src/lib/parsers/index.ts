import {
  isOpenRouterConfigured,
  isSelfHostedLlmConfigured,
} from "@/lib/env";
import { visionExtract } from "@/lib/llm/vision";

export async function parsePdf(buffer: Buffer): Promise<string> {
  // pdf-parse v1.x is the Node-compatible line. v2.x pulls pdfjs-dist v5
  // which requires browser DOM globals (DOMMatrix) that don't exist in
  // Vercel's serverless runtime, breaking uploads with "DOMMatrix is not
  // defined" or generic 500s. Importing /lib/pdf-parse.js bypasses the
  // package's debug-only index that tries to read a test PDF at module init.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-expect-error pdf-parse/lib/pdf-parse.js has no type declarations
  const mod: any = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return result.text;
}

export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string; tokenCount: number }> {
  let text: string;

  switch (mimeType) {
    case "application/pdf":
      text = await parsePdf(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      text = await parseDocx(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      text = await parseXlsx(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      text = await parsePptx(buffer);
      break;
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      text = await parseImage(buffer, mimeType);
      break;
    case "text/plain":
    case "text/csv":
      text = buffer.toString("utf-8");
      break;
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }

  return { text, tokenCount: estimateTokenCount(text) };
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
  });
  return sheets.join("\n\n");
}

// ────────────────────────────────────────────────────────────────
// PPTX
// ────────────────────────────────────────────────────────────────
// A .pptx is a ZIP archive of XML parts. Slide text lives in
// `ppt/slides/slideN.xml` inside <a:t> elements. Speaker notes live
// in `ppt/notesSlides/notesSlideN.xml`. We walk the archive, extract
// text in reading order, and emit slide-delimited markdown so the
// downstream report engine can cite "slide 3" specifically.
//
// Diagrams / charts / images inside a slide are NOT captured here —
// those require a vision pass (slide-to-image render + VLM). Users
// who need diagram capture should export the slide as PNG and upload
// the image directly; the image path below will VLM-extract it.
// ────────────────────────────────────────────────────────────────
async function parsePptx(buffer: Buffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideIndex(a) - slideIndex(b));

  if (slideFiles.length === 0) {
    throw new Error("PPTX contained no slide parts");
  }

  const sections: string[] = [];
  for (const slidePath of slideFiles) {
    const idx = slideIndex(slidePath);
    const xml = await zip.files[slidePath].async("string");
    const bodyText = extractPptxText(xml);

    const notesPath = `ppt/notesSlides/notesSlide${idx}.xml`;
    let notesText = "";
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async("string");
      notesText = extractPptxText(notesXml);
    }

    const lines: string[] = [`## Slide ${idx}`];
    if (bodyText.trim()) {
      lines.push(bodyText.trim());
    }
    if (notesText.trim()) {
      lines.push("", "### Speaker notes", notesText.trim());
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

function slideIndex(path: string): number {
  const m = path.match(/(\d+)\.xml$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Extract visible text from a single slide/notes XML part.
 * Each <a:t>…</a:t> is a text run; each <a:p> is a paragraph. We
 * emit one line per paragraph so bullets stay readable.
 */
function extractPptxText(xml: string): string {
  const paragraphs: string[] = [];
  const paraRe = /<a:p[\s\S]*?<\/a:p>/g;
  const runRe = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

  const paraMatches = xml.match(paraRe) ?? [];
  for (const p of paraMatches) {
    const runs: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(runRe.source, "g");
    while ((m = re.exec(p)) !== null) {
      runs.push(decodeXmlEntities(m[1]));
    }
    const line = runs.join("").trim();
    if (line) paragraphs.push(line);
  }

  return paragraphs.join("\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// ────────────────────────────────────────────────────────────────
// Images (PNG / JPEG / WEBP)
// ────────────────────────────────────────────────────────────────
// Architecture diagrams, screenshotted org charts, and slide exports
// are pure vision problems — there is no text layer to extract. We
// send the raw bytes to a vision-capable LLM and ask it to render
// everything it sees as structured diligence-grade markdown.
//
// Provider preference: OpenRouter (Claude 3.5 Sonnet / GPT-4o class)
// when configured, falling back to a self-hosted vision model if the
// operator has set SELF_HOSTED_LLM_VISION_MODEL.
// ────────────────────────────────────────────────────────────────
async function parseImage(buffer: Buffer, mimeType: string): Promise<string> {
  if (!isOpenRouterConfigured() && !isSelfHostedLlmConfigured()) {
    throw new Error(
      "Vision extraction requires a configured LLM provider (OPENROUTER_API_KEY or SELF_HOSTED_LLM_*).",
    );
  }

  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const markdown = await visionExtract({
    imageDataUrl: dataUrl,
    prompt: VISION_EXTRACTION_PROMPT,
  });

  if (!markdown.trim()) {
    throw new Error("Vision model returned empty output");
  }
  return markdown.trim();
}

const VISION_EXTRACTION_PROMPT = `You are extracting evidence from a diligence artifact (architecture diagram, slide, org chart, screenshot, or whiteboard photo) for an AI-systems investment committee.

Produce dense, structured GitHub-flavored markdown that captures EVERYTHING visible. Do NOT summarize; transcribe.

Required structure (omit sections only if truly absent):

## Title / Caption
Exact text of any title, header, or caption.

## Components
Every named box, service, database, model, vendor, product, team, or role. One bullet per item. Include version numbers, model names (e.g. "Claude 3.5 Sonnet"), vendor names (e.g. "Pinecone"), and environments (prod / staging) when shown.

## Connections / Data Flow
Every arrow, edge, or dependency. Format: "Source → Target: label (protocol / payload / frequency if shown)".

## Annotations & Callouts
Any sticky notes, badges, tags, severity markers, or inline commentary. Quote the text verbatim.

## Numeric Claims
Every number visible — percentages, dollar amounts, latencies, counts, dates, SLAs. Keep units.

## Text Blocks
Any paragraph-style text not already captured. Transcribe faithfully.

## Diligence Flags
Specific items a diligence reviewer should validate — missing redundancy, single points of failure, unencrypted links, vendor concentration, privacy-sensitive paths, ambiguous ownership. Be concrete.

Rules:
- Transcribe, do not interpret. If a label is illegible, write "[illegible]".
- Never invent components that aren't shown.
- Preserve exact casing of proper nouns (vendors, products, models).
- Return ONLY the markdown. No preamble, no closing remarks, no code fences around the whole output.`;

