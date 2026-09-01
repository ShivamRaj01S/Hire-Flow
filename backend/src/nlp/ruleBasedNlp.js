/**
 * Rule-Based NLP Engine (Phase 2 with actual PDF/DOCX parsing).
 */

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractPdfText(fileBuffer) {
  // Support both modern pdf-parse (PDFParse class) and older function export.
  if (pdfParse && typeof pdfParse.PDFParse === "function") {
    const parser = new pdfParse.PDFParse({ data: fileBuffer });
    try {
      const result = await parser.getText();
      return String(result?.text || "");
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (typeof pdfParse === "function") {
    const result = await pdfParse(fileBuffer);
    return String(result?.text || "");
  }

  if (pdfParse && typeof pdfParse.default === "function") {
    const result = await pdfParse.default(fileBuffer);
    return String(result?.text || "");
  }

  throw new Error("Unsupported pdf-parse export shape.");
}

// Small stop-word set for placeholder preprocessing.
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", 
  "from", "has", "he", "in", "is", "it", "its", "of", "on", 
  "that", "the", "to", "was", "were", "will", "with"
]);

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Text Extraction (PDF/DOCX) — Updated to parse real files.
 * @param {{ mimeType?: string, fileBuffer?: Buffer }} args
 * @returns {Promise<{ rawExtractedText: string }>}
 */
async function extractTextFromFile(args) {
  const mimeType = args?.mimeType ? String(args.mimeType).toLowerCase() : "";
  const fileBuffer = args?.fileBuffer;

  if (!fileBuffer) {
    console.warn("No file buffer provided to extractTextFromFile");
    return { rawExtractedText: "" };
  }

  try {
    let extractedText = "";

    // Parse PDF files
    if (mimeType.includes("pdf")) {
      extractedText = await extractPdfText(fileBuffer);
    }
    // Parse DOCX / Word files
    else if (mimeType.includes("word") || mimeType.includes("docx") || mimeType.includes("officedocument")) {
      const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = docxData.value;
    } 
    // Fallback
    else {
      console.warn(`Unsupported file type: ${mimeType}`);
      extractedText = "";
    }

    return { rawExtractedText: extractedText };

  } catch (error) {
    console.error("Error extracting text from file:", error);
    return { rawExtractedText: "" };
  }
}

/**
 * Preprocessing (Tokenization + stop-word removal).
 * @param {string} rawText
 * @returns {Promise<{ preprocessedText: string, tokens: string[] }>}
 */
async function preprocessText(rawText) {
  const text = normalizeText(rawText);
  const tokens = text
    .split(/[^a-z0-9+#.]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Preserve a simple readable string for debugging/transparency.
  const preprocessedText = tokens.join(" ");
  return { preprocessedText, tokens };
}

/**
 * Bias Minimization — scrub demographic attributes before scoring.
 * @param {string} text
 * @returns {Promise<{ scrubbedText: string }>}
 */
async function biasMinimize(text) {
  let t = normalizeText(text);

  // Remove common demographic hints (age, gender markers, ethnicity/race keywords).
  t = t.replace(/\b(age|years old|born)\s*\d{1,3}\b/gi, " ");
  t = t.replace(/\b(male|female|woman|man|non-binary|gender)\b/gi, " ");
  t = t.replace(
    /\b(caucasian|asian|black|african|hispanic|latino|latina|white|race|ethnicity)\b/gi,
    " "
  );

  // Remove standalone numeric-only tokens that might represent age.
  t = t.replace(/\b\d{2}\b/g, " ");

  return { scrubbedText: t.replace(/\s+/g, " ").trim() };
}

/**
 * Weighted Scoring Calculation (rule-based keyword match).
 * @param {{ preprocessedText: string, jobSkillsWeights: Record<string, number> }} args
 * @returns {Promise<{ matchedSkills: string[], missingSkills: string[], overallMatchPercentage: number }>}
 */
async function calculateWeightedScore(args) {
  const preprocessedText = normalizeText(args?.preprocessedText);
  const jobSkillsWeights = args?.jobSkillsWeights || {};

  const skills = Object.entries(jobSkillsWeights).filter(([, w]) => {
    const weight = Number(w);
    return Number.isFinite(weight) && weight > 0;
  });

  const matchedSkills = [];
  const missingSkills = [];

  let earned = 0;
  let total = 0;

  for (const [skill, rawWeight] of skills) {
    const weight = Number(rawWeight);
    total += weight;

    // Simple substring match; later replace with better NLP similarity.
    const token = normalizeText(skill);
    const has = token.length > 0 && preprocessedText.includes(token);
    if (has) {
      matchedSkills.push(skill);
      earned += weight;
    } else {
      missingSkills.push(skill);
    }
  }

  const overallMatchPercentage =
    total > 0 ? Math.round((earned / total) * 100) : 0;

  return {
    matchedSkills,
    missingSkills,
    overallMatchPercentage
  };
}

module.exports = {
  extractTextFromFile,
  preprocessText,
  biasMinimize,
  calculateWeightedScore
};