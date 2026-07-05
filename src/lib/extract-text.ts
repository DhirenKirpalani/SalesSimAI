import mammoth from "mammoth";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

// pdf2json is CommonJS only
const PDFParser = require("pdf2json");

async function extractPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const text = pdfData?.Pages?.map((page: any) =>
          page.Texts?.map((t: any) => {
            const raw = t.R?.[0]?.T ?? "";
            try {
              return decodeURIComponent(raw);
            } catch {
              return raw;
            }
          }).join(" ")
        ).join("\n") ?? "";
        resolve(text.trim());
      });
      pdfParser.on("pdfParser_dataError", (err: any) => {
        console.error("[extract-text] PDF parse error:", err);
        resolve("");
      });
      pdfParser.parseBuffer(buffer);
    } catch (e) {
      console.error("[extract-text] PDF parse error:", e);
      resolve("");
    }
  });
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() ?? "";
  } catch (e) {
    console.error("[extract-text] DOCX parse error:", e);
    return "";
  }
}

async function extractPptx(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const texts: string[] = [];

    // PPTX structure: ppt/slides/slide1.xml, slide2.xml, etc.
    const slideFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    for (const fileName of slideFiles.sort()) {
      const file = zip.files[fileName];
      if (!file) continue;
      const xml = await file.async("text");
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const textNodes = doc.getElementsByTagName("a:t");
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes.item(i);
        if (node?.firstChild?.nodeValue) {
          texts.push(node.firstChild.nodeValue);
        }
      }
    }

    // Also extract notes if present
    const noteFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/notesSlides/") && name.endsWith(".xml")
    );
    for (const fileName of noteFiles.sort()) {
      const file = zip.files[fileName];
      if (!file) continue;
      const xml = await file.async("text");
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const textNodes = doc.getElementsByTagName("a:t");
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes.item(i);
        if (node?.firstChild?.nodeValue) {
          texts.push(node.firstChild.nodeValue);
        }
      }
    }

    return texts.join(" ").trim();
  } catch (e) {
    console.error("[extract-text] PPTX parse error:", e);
    return "";
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const name = fileName.toLowerCase();
  const type = mimeType;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdf(buffer);
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return extractDocx(buffer);
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  ) {
    return extractPptx(buffer);
  }
  if (
    type?.includes("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".vtt") ||
    name.endsWith(".srt")
  ) {
    return buffer.toString("utf-8").trim();
  }
  if (name.endsWith(".json") || name.endsWith(".csv")) {
    return buffer.toString("utf-8").trim();
  }

  console.warn("[extract-text] Unsupported file type:", type, name);
  return "";
}
