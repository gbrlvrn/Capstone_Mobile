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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an identity document verification AI for a lending/financial mobile app in the Philippines.

Analyze the image and determine if it contains a valid Philippine government-issued ID card.

Valid Philippine government IDs include (but are not limited to):
- Driver's License (Land Transportation Office / LTO)
- Philippine Passport
- SSS (Social Security System) ID
- GSIS (Government Service Insurance System) ID
- PhilHealth ID
- Pag-IBIG / HDMF ID
- Philippine National ID (PhilSys)
- Voter's ID / COMELEC ID
- PRC (Professional Regulation Commission) ID
- Postal ID
- Senior Citizen's ID
- PWD ID
- NBI Clearance (as supporting document)
- BIR (TIN) ID
- Unified Multi-purpose ID (UMID)
- School ID (for students, if issued by DepEd/CHED school)
- OFW ID / iDOLE

Rejection criteria (return valid: false if ANY of these apply):
- The image is a selfie, portrait, or photo of a person (without clearly showing an ID card)
- The image contains random objects, food, scenery, memes, or screenshots
- The image is too blurry or dark to read
- No physical ID card is clearly visible in the frame
- The image shows a card that is NOT an official government ID (e.g., loyalty card, hotel key, generic business card)

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{"valid": true, "idType": "Philippine Driver's License", "confidence": "high", "reason": "A valid LTO driver's license is clearly visible in the image."}

Or if invalid:
{"valid": false, "idType": null, "confidence": "high", "reason": "The image appears to be a selfie with no visible ID card."}`;

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
        idType: "Unknown ID",
        confidence: "low",
        reason: "AI verification inconclusive. Document accepted for manual review.",
      });
    }

    return res.json({
      valid: !!parsed.valid,
      idType: parsed.idType || null,
      confidence: parsed.confidence || "medium",
      reason: parsed.reason || "",
    });
  } catch (err) {
    console.error("[ID Verify] Error:", err.message || err);
    // On API error, fail-open so users aren't permanently blocked
    return res.status(500).json({
      message: "ID verification service unavailable. Please retake and try again.",
    });
  }
}
