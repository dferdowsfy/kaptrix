export async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
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
      text = await parsePptx();
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

async function parsePptx(): Promise<string> {
  throw new Error(
    "PPTX parsing is not enabled in this local build yet. Use PDF, DOCX, XLSX, TXT, or CSV for now.",
  );
}
