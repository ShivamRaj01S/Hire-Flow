/**
 * ML/NLP Engine
 * Replaces the rule-based approach while preserving the API contract.
 */

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const natural = require("natural");
const { pipeline, cos_sim } = require("@huggingface/transformers");

async function extractPdfText(fileBuffer) {
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

async function extractTextFromFile(args) {
  const mimeType = args?.mimeType ? String(args.mimeType).toLowerCase() : "";
  const fileBuffer = args?.fileBuffer;

  if (!fileBuffer) {
    console.warn("No file buffer provided to extractTextFromFile");
    return { rawExtractedText: "" };
  }

  try {
    let extractedText = "";
    if (mimeType.includes("pdf")) {
      extractedText = await extractPdfText(fileBuffer);
    } else if (mimeType.includes("word") || mimeType.includes("docx") || mimeType.includes("officedocument")) {
      const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = docxData.value;
    } else {
      console.warn(`Unsupported file type: ${mimeType}`);
      extractedText = "";
    }
    return { rawExtractedText: extractedText };
  } catch (error) {
    console.error("Error extracting text from file:", error);
    return { rawExtractedText: "" };
  }
}

// ---------------------------------------------------------
// ML/NLP ENHANCEMENTS
// ---------------------------------------------------------

const tokenizer = new natural.WordTokenizer();

// A broader, more robust set of stop words
const STOP_WORDS = new Set([
  ...natural.stopwords, "a", "an", "and", "are", "as", "at", "be", "by", "for", 
  "from", "has", "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", 
  "was", "were", "will", "with"
]);

/**
 * Preprocessing (Tokenization + stop-word removal using natural NLP).
 */
async function preprocessText(rawText) {
  const text = String(rawText || "").toLowerCase().replace(/\s+/g, " ").trim();
  const rawTokens = tokenizer.tokenize(text) || [];
  
  const tokens = rawTokens
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
    .map(t => natural.PorterStemmer.stem(t)); // Stemming for semantic normalization

  // We preserve the unstemmed string for the Transformer embedding logic below
  const preprocessedText = rawTokens.filter(t => !STOP_WORDS.has(t)).join(" ");
  return { preprocessedText, tokens };
}

/**
 * Bias Minimization — scrub demographic attributes using advanced regex.
 */
async function biasMinimize(text) {
  let t = String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  t = t.replace(/\b(age|years old|born)\s*\d{1,3}\b/gi, " ");
  t = t.replace(/\b(male|female|woman|man|non-binary|gender|boy|girl)\b/gi, " ");
  t = t.replace(/\b(caucasian|asian|black|african|hispanic|latino|latina|white|race|ethnicity|indian|american|european)\b/gi, " ");
  t = t.replace(/\b\d{2}\b/g, " ");
  return { scrubbedText: t.replace(/\s+/g, " ").trim() };
}

let featureExtractor = null;

async function getExtractor() {
  if (!featureExtractor) {
    featureExtractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
  }
  return featureExtractor;
}

/**
 * Weighted Scoring Calculation (ML/NLP similarity based).
 */
async function calculateWeightedScore(args) {
  const preprocessedText = String(args?.preprocessedText || "").toLowerCase();
  const jobSkillsWeights = args?.jobSkillsWeights || {};

  const skills = Object.entries(jobSkillsWeights).filter(([, w]) => {
    const weight = Number(w);
    return Number.isFinite(weight) && weight > 0;
  });

  const matchedSkills = [];
  const missingSkills = [];

  let earned = 0;
  let total = 0;

  if (skills.length === 0) {
    return { matchedSkills, missingSkills, overallMatchPercentage: 0 };
  }

  const tokenizedTextWords = preprocessedText.split(/\s+/);

  try {
    const extractor = await getExtractor();
    
    // We chunk the text into roughly 100-word blocks (or 500 chars) to maintain semantic focus
    const chunks = preprocessedText.match(/.{1,500}(\s|$)/g) || [preprocessedText];
    
    const chunkEmbeddings = await Promise.all(
      chunks.map(async chunk => {
        const out = await extractor(chunk, { pooling: "mean", normalize: true });
        return out.tolist()[0];
      })
    );

    for (const [skill, rawWeight] of skills) {
      const weight = Number(rawWeight);
      total += weight;
      
      let isMatch = false;
      const skillToken = String(skill).toLowerCase().trim();
      
      // 1. Direct Substring / exact match is always a match
      if (skillToken.length > 0 && preprocessedText.includes(skillToken)) {
         isMatch = true;
      } else {
         // 2. Jaro-Winkler for typos
         for (const word of tokenizedTextWords) {
            if (natural.JaroWinklerDistance(skillToken, word) > 0.88) {
               isMatch = true;
               break;
            }
         }
         
         // 3. Semantic similarity using Transformers
         if (!isMatch) {
           const skillOutput = await extractor(skillToken, { pooling: "mean", normalize: true });
           const skillEmbedding = skillOutput.tolist()[0];
           
           for (const chunkEmbedding of chunkEmbeddings) {
              const similarity = cos_sim(skillEmbedding, chunkEmbedding);
              if (similarity > 0.50) { // Semantic threshold
                 isMatch = true;
                 break;
              }
           }
         }
      }

      if (isMatch) {
        matchedSkills.push(skill);
        earned += weight;
      } else {
        missingSkills.push(skill);
      }
    }
  } catch (error) {
    console.warn("ML model inference failed, falling back to pure rule-based NLP", error);
    for (const [skill, rawWeight] of skills) {
       const weight = Number(rawWeight);
       total += weight;
       const skillToken = String(skill).toLowerCase().trim();
       
       let isMatch = skillToken.length > 0 && preprocessedText.includes(skillToken);
       if (!isMatch) {
          for (const word of tokenizedTextWords) {
             if (natural.JaroWinklerDistance(skillToken, word) > 0.88) {
                isMatch = true;
                break;
             }
          }
       }
       if (isMatch) {
          matchedSkills.push(skill);
          earned += weight;
       } else {
          missingSkills.push(skill);
       }
    }
  }

  const overallMatchPercentage = total > 0 ? Math.round((earned / total) * 100) : 0;

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
