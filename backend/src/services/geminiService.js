import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Gemini AI Service — The "Brain" of CHARCHA (doc §5.1.2, §5.2.2, §5.2.4)
 * ─────────────────────────────────────────────────────────
 * Responsibilities:
 *  1. analyzeIssueImage()      → Vision analysis: category, title, description,
 *                                severity, suggested department (doc §5.1.2)
 *  2. calculatePriorityScore() → Priority scoring from severity, population,
 *                                location importance, support count (doc §5.2.2)
 *  3. moderateContent()        → NSFW / spam detection → shadow-ban (doc edge case)
 *  4. verifyResolutionImage()  → Compare before/after photos (doc §5.2.4)
 *
 * Graceful degradation: if no GEMINI_API_KEY is configured, the service falls
 * back to a deterministic mock so the hackathon demo still works end-to-end.
 */

const genAI = config.geminiApiKey
  ? new GoogleGenerativeAI(config.geminiApiKey)
  : null;

const model = genAI
  ? genAI.getGenerativeModel({ model: config.geminiModel })
  : null;

// ── Category → Department routing map (doc §5.1.11.2) ──
const CATEGORY_DEPARTMENT_MAP = {
  Pothole: 'Public Works Department (PWD)',
  Garbage: 'Nagar Nigam (Municipal Corporation)',
  'Water Leakage': 'Jal Nigam (Water Department)',
  'Broken Streetlight': 'Electricity Department',
  'Public Infrastructure Damage': 'Public Works Department (PWD)',
  Other: 'Nagar Nigam (Municipal Corporation)',
};

const VALID_CATEGORIES = [
  'Pothole',
  'Garbage',
  'Water Leakage',
  'Broken Streetlight',
  'Public Infrastructure Damage',
  'Other',
];

const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Analyze an uploaded issue image using Gemini Vision.
 * Returns a structured report: category, title, description, severity,
 * suggestedDepartment (doc §5.1.2).
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<object>} { category, title, description, severity, suggestedDepartment }
 */
export const analyzeIssueImage = async (imageBuffer, mimeType) => {
  // ── Mock fallback (no API key) ──
  if (!model) {
    logger.warn('⚠️  Gemini API key not set — using mock image analysis.');
    return mockAnalyzeImage();
  }

  try {
    const prompt = `You are CHARCHA, an AI civic intelligence assistant. Analyze this image of a civic issue and return ONLY a valid JSON object (no markdown, no code fences) with these exact fields:
{
  "category": one of [${VALID_CATEGORIES.join(', ')}],
  "title": a concise 6-10 word title describing the issue,
  "description": a 2-3 sentence detailed description of the problem and its impact,
  "severity": one of [${VALID_SEVERITIES.join(', ')}],
  "suggestedDepartment": the most appropriate government department name
}

Rules:
- Base severity on real-world risk to public safety (Critical = immediate danger to life, High = significant hazard, Medium = noticeable problem, Low = minor inconvenience).
- If the image is not a civic issue or is unclear, set category to "Other".
- Return ONLY the JSON object.`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    ]);

    const text = result.response.text().trim();
    const parsed = safeParseJson(text);

    return {
      category: VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'Other',
      title: parsed.title || 'Civic issue reported',
      description: parsed.description || 'No description available.',
      severity: VALID_SEVERITIES.includes(parsed.severity)
        ? parsed.severity
        : 'Medium',
      suggestedDepartment:
        parsed.suggestedDepartment ||
        CATEGORY_DEPARTMENT_MAP[parsed.category] ||
        'Nagar Nigam (Municipal Corporation)',
    };
  } catch (error) {
    logger.error(`Gemini analyzeIssueImage error: ${error.message}`);
    // Fail soft — never block a report because AI failed.
    return mockAnalyzeImage();
  }
};

/**
 * Calculate an AI priority score (0–100) for an issue.
 * Factors (doc §5.2.2): severity, population affected, location importance,
 * community support count.
 *
 * @param {object} issue - The issue document
 * @returns {Promise<{score:number, priority:string}>}
 */
export const calculatePriorityScore = async (issue) => {
  const severityWeight = { Low: 10, Medium: 30, High: 60, Critical: 90 };
  const severityScore = severityWeight[issue.severity] ?? 30;

  // Support count contribution (capped at 20 points).
  const supportScore = Math.min((issue.supportCount || 0) * 2, 20);

  // Confirmation count contribution (capped at 15 points).
  const confirmationScore = Math.min((issue.confirmationCount || 0) * 3, 15);

  // Location importance: central areas (Hazratganj, MG Road) get a boost.
  const importantAreas = ['hazratganj', 'mg road', 'hazaratganj', 'station'];
  const areaLower = (issue.location?.areaName || '').toLowerCase();
  const locationScore = importantAreas.some((a) => areaLower.includes(a))
    ? 15
    : 5;

  // Population affected estimate (heuristic from severity + support).
  const populationScore = Math.min(
    (issue.supportCount || 0) + (issue.confirmationCount || 0) * 2,
    15
  );

  const total =
    severityScore + supportScore + confirmationScore + locationScore + populationScore;
  const score = Math.min(Math.round(total), 100);

  let priority = 'Medium';
  if (score >= 80) priority = 'Critical';
  else if (score >= 60) priority = 'High';
  else if (score >= 30) priority = 'Medium';
  else priority = 'Low';

  return { score, priority };
};

/**
 * Moderate content for NSFW / spam (doc edge case: "Trolls and NSFW").
 * Returns a moderation verdict. If flagged, the caller hides the report and
 * shadow-bans the user.
 *
 * @param {Buffer|null} imageBuffer
 * @param {string} mimeType
 * @param {string} text - title + description
 * @returns {Promise<{isFlagged:boolean, flag:string}>}
 */
export const moderateContent = async (imageBuffer, mimeType, text) => {
  // ── Mock fallback ──
  if (!model) {
    return { isFlagged: false, flag: 'approved' };
  }

  try {
    const prompt = `You are a strict content moderator for a civic platform. Analyze the following content for NSFW, abusive, spam, or inappropriate material. Return ONLY a JSON object:
{"isFlagged": boolean, "flag": "none" | "nsfw" | "spam" | "abuse"}

Content text: "${(text || '').slice(0, 500)}"`;

    const parts = [{ text: prompt }];
    if (imageBuffer) {
      parts.push({
        inlineData: { data: imageBuffer.toString('base64'), mimeType },
      });
    }

    const result = await model.generateContent(parts);
    const parsed = safeParseJson(result.response.text().trim());

    return {
      isFlagged: Boolean(parsed.isFlagged),
      flag: parsed.flag || 'none',
    };
  } catch (error) {
    logger.error(`Gemini moderateContent error: ${error.message}`);
    // Fail open on moderation errors so reports aren't blocked.
    return { isFlagged: false, flag: 'approved' };
  }
};

/**
 * Verify a resolution "after" image against the original issue.
 * (doc §5.2.4 — Resolution Evidence)
 *
 * @param {Buffer} afterImageBuffer
 * @param {string} mimeType
 * @param {object} originalIssue
 * @returns {Promise<{isResolved:boolean, confidence:number, note:string}>}
 */
export const verifyResolutionImage = async (
  afterImageBuffer,
  mimeType,
  originalIssue
) => {
  // ── Mock fallback ──
  if (!model) {
    return {
      isResolved: true,
      confidence: 0.85,
      note: 'Resolution appears consistent with the reported issue.',
    };
  }

  try {
    const prompt = `You are CHARCHA's resolution verifier. Compare this "after" photo against the original issue:
Original category: ${originalIssue.category}
Original description: ${originalIssue.description}

Determine if the issue appears genuinely resolved in this photo. Return ONLY JSON:
{"isResolved": boolean, "confidence": 0-1, "note": "brief explanation"}`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: {
        data: afterImageBuffer.toString('base64'),
        mimeType,
      } },
    ]);

    const parsed = safeParseJson(result.response.text().trim());
    return {
      isResolved: Boolean(parsed.isResolved),
      confidence: Number(parsed.confidence) || 0,
      note: parsed.note || 'Verification complete.',
    };
  } catch (error) {
    logger.error(`Gemini verifyResolutionImage error: ${error.message}`);
    return {
      isResolved: true,
      confidence: 0.5,
      note: 'Automatic verification unavailable.',
    };
  }
};

// ── Helpers ──

/**
 * Safely parse a JSON string that may be wrapped in markdown code fences.
 */
const safeParseJson = (text) => {
  try {
    // Strip markdown code fences if present.
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
};

/**
 * Deterministic mock image analysis used when no Gemini key is configured.
 * Mirrors the frontend's mock behaviour so the demo flow is identical.
 */
const mockAnalyzeImage = () => {
  return {
    category: 'Pothole',
    title: 'Large pothole causing traffic hazard',
    description:
      'A significant pothole detected in the image. The damage appears to be on a main road and poses risk to two-wheelers. Immediate repair recommended.',
    severity: 'High',
    suggestedDepartment: CATEGORY_DEPARTMENT_MAP.Pothole,
  };
};

export default {
  analyzeIssueImage,
  calculatePriorityScore,
  moderateContent,
  verifyResolutionImage,
};
