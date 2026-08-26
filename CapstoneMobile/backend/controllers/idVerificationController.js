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

    if (!base64 || typeof base64 !== "string" || base64.trim().length < 100) {
      return res.status(400).json({
        valid: false,
        idType: null,
        confidence: "high",
        reason: "Invalid or empty image data provided. Please capture a clear photo of your ID.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[ID Verify] GEMINI_API_KEY is not configured.");
      return res.json({
        valid: false,
        idType: null,
        confidence: "low",
        reason: "ID verification service unavailable. GEMINI_API_KEY is missing.",
      });
    }

    const prompt = `You are a strict identity document verification AI for a mobile app in the Philippines.

Task: Analyze the provided image and determine if it contains an actual, recognizable Philippine government-issued ID card or official identity document.

Recognized Philippine Identity Documents:
- Philippine National ID (PhilSys / ePhilID)
- Driver's License (LTO)
- Philippine Passport
- SSS ID / UMID
- GSIS ID
- PhilHealth Card
- Pag-IBIG / HDMF ID
- Voter's ID / COMELEC Certificate
- PRC ID Card
- Postal ID
- Senior Citizen ID / PWD ID
- NBI / Police Clearance
- BIR (TIN) ID
- Barangay Clearance / Barangay ID
- Student / School ID

STRICT EVALUATION RULES:
1. Is an actual identity card, passport, or official ID document clearly visible?
2. If the image is a selfie or portrait WITHOUT an ID card held up or displayed, return valid: false.
3. If the image is a random shot (scenery, ceiling, floor, furniture, food, pets, screenshot of non-ID, memes, shoes, clothing, car, laptop, or blank image), return valid: false.
4. If the image is a generic document that is NOT an identity document (e.g. random paper, receipt, book, notebook), return valid: false.
5. Return valid: true ONLY if an official government or student ID card/document is present in the photo.

Output Format: Respond ONLY with raw JSON in this exact structure:
{"valid": true, "idType": "Driver's License", "confidence": "high", "reason": "Valid LTO Driver's License detected."}
or
{"valid": false, "idType": null, "confidence": "high", "reason": "No valid government ID card detected in the image. Please take a clear photo of your ID card."}`;

    const modelSlugs = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
    let result = null;
    let lastError = null;

    for (const slug of modelSlugs) {
      try {
        const model = genAI.getGenerativeModel({ model: slug });
        result = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ]);
        if (result && result.response) break;
      } catch (err) {
        lastError = err;
        console.warn(`[ID Verify] Model ${slug} failed:`, err.message || err);
      }
    }

    if (!result || !result.response) {
      console.error("[ID Verify] All models failed:", lastError?.message || lastError);
      return res.json({
        valid: false,
        idType: null,
        confidence: "low",
        reason: "ID verification AI service error. Please retake a clear, well-lit photo of your ID.",
      });
    }

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      const isValid = Boolean(parsed.valid);
      return res.json({
        valid: isValid,
        idType: isValid ? (parsed.idType || "Philippine Government ID") : null,
        confidence: parsed.confidence || (isValid ? "high" : "low"),
        reason: parsed.reason || (isValid ? "Valid Philippine ID detected." : "No valid government ID card detected in the image."),
      });
    } catch {
      console.error("[ID Verify] Gemini returned non-JSON:", rawText);
      return res.json({
        valid: false,
        idType: null,
        confidence: "low",
        reason: "Unable to analyze ID image clearly. Please retake a clear photo of your ID card.",
      });
    }
  } catch (err) {
    console.error("[ID Verify] Error:", err.message || err);
    return res.json({
      valid: false,
      idType: null,
      confidence: "low",
      reason: "ID verification system error. Please retake photo of your ID.",
    });
  }
}
