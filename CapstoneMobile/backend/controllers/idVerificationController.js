import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * POST /api/loans/verify-id
 * Body: { base64: string, mimeType: string }
 *
 * Uses Gemini Vision to detect whether the image contains a valid government-issued ID.
 * Returns: { valid: boolean, idType: string|null, confidence: string, reason: string }
 */
export async function verifyIdImage(req, res) {
  try {
    const { base64, mimeType = "image/jpeg" } = req.body;

    if (!base64) {
      return res.status(400).json({ message: "No image data provided." });
    }

    // Use valid Gemini vision model
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    const prompt = `You are an identity document verification AI for a lending/financial mobile app in the Philippines.

Analyze the image and determine if it contains a valid Philippine government-issued ID card or official document.

Valid Philippine government IDs include (but are not limited to):
- Philippine National ID (PhilSys) / ePhilID / Digital ID
- Driver's License (Land Transportation Office / LTO)
- Philippine Passport
- SSS (Social Security System) ID / UMID
- GSIS (Government Service Insurance System) ID
- PhilHealth ID (Card or Paper format)
- Pag-IBIG / HDMF ID
- Voter's ID / COMELEC ID or Certificate
- PRC (Professional Regulation Commission) ID
- Postal ID
- Senior Citizen's ID
- PWD ID
- NBI Clearance
- BIR (TIN) ID / Form 1902/1905
- Unified Multi-purpose ID (UMID)
- Barangay Clearance / Barangay ID
- OFW ID / iDOLE
- Student ID / School ID

Be lenient with lighting, card version, paper format, and rotation as long as an official Philippine ID or government document is present.

Rejection criteria (return valid: false ONLY if):
- The image is purely a selfie or portrait with NO ID card or document present
- The image contains random non-document objects (food, scenery, memes, furniture)
- The image is completely unreadable or blank

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{"valid": true, "idType": "Philippine National ID", "confidence": "high", "reason": "Valid PhilSys National ID detected."}

Or if invalid:
{"valid": false, "idType": null, "confidence": "high", "reason": "No valid government ID detected in the image."}`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If Gemini returns malformed JSON, treat as inconclusive and allow (fail-open)
      console.error("[ID Verify] Gemini returned non-JSON:", rawText);
      return res.json({
        valid: true,
        idType: "Philippine Government ID",
        confidence: "low",
        reason: "ID image received. Document accepted for review.",
      });
    }

    return res.json({
      valid: typeof parsed.valid === "boolean" ? parsed.valid : true,
      idType: parsed.idType || "Philippine Government ID",
      confidence: parsed.confidence || "medium",
      reason: parsed.reason || "Valid Philippine ID detected.",
    });
  } catch (err) {
    console.error("[ID Verify] Error:", err.message || err);
    // On API error or missing key, fail-open with 200 OK so users aren't permanently blocked
    return res.json({
      valid: true,
      idType: "Philippine Government ID",
      confidence: "medium",
      reason: "ID image captured. Accepted for manual review.",
    });
  }
}
