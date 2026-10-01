import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * POST /api/donations/verify-receipt
 * Body: { base64: string, mimeType?: string, paymentMethod?: string }
 *
 * Uses Gemini Vision to verify whether an uploaded image is a legitimate
 * payment receipt. Enforces strict per-method validation:
 * - "gcash"/"ewallet" → only e-wallet receipts (GCash, Maya, Maribank)
 * - "bank" → only bank transfer receipts
 * Returns: { valid: boolean, provider: string|null, confidence: string, reason: string }
 */
export async function verifyReceipt(req, res) {
  try {
    const { base64, mimeType = "image/jpeg", paymentMethod = "" } = req.body;

    const inputImage = req.body.base64 || req.body.image || "";
    if (!inputImage || typeof inputImage !== "string" || inputImage.trim().length < 100) {
      return res.status(400).json({
        valid: false,
        provider: null,
        confidence: "high",
        reason: "Invalid or empty image data provided. Please upload a clear screenshot of your payment receipt.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Receipt Verify] GEMINI_API_KEY is not configured.");
      return res.json({
        valid: false,
        provider: null,
        confidence: "low",
        reason: "Receipt verification service unavailable. Please try again later.",
      });
    }

    // Strip data URI prefix if present so we send raw base64 to Gemini
    const rawBase64 = inputImage.replace(/^data:image\/\w+;base64,/, "");

    // Build strict prompt based on payment method
    const method = (paymentMethod || "").toLowerCase();
    const isEwallet = method === "gcash" || method === "maya" || method === "e-wallet" || method === "ewallet";
    const isBank = method === "bank" || method === "bank_transfer" || method === "bank transfer";

    const commonExtraction = `
If valid (valid: true), accurately extract:
1. "provider": e.g. "GCash", "Maya", "BDO", "BPI", "UnionBank", etc.
2. "paymentMethod": "gcash" for e-wallets, "bank" for bank transfers.
3. "amount": total amount transferred/paid as a numeric float/int (e.g. 500 or 1500.50). MUST be a pure number without currency symbol or commas.
4. "referenceNumber": reference number or transaction number (digits/letters without spaces, e.g. "10029381928").
5. "senderName": sender name if clearly visible, or null.
6. "reason": concise summary.`;

    let prompt;
    if (isEwallet) {
      prompt = `You are a STRICT e-wallet receipt validator and parser for a church giving mobile app in the Philippines.

Task: Determine if the image is a REAL, completed transaction receipt from a Philippine e-wallet app (GCash, Maya, Maribank).

STRICTLY REJECT (valid: false):
- Bank transfer confirmations (BDO, BPI, etc.)
- Selfies, portraits, photos of people, scenery, food, pets, memes, chat screenshots, IDs
- E-wallet HOME screens, balance screens, or blank forms
- Physical paper receipts or ATM slips

The image MUST show a completed e-wallet transaction with at minimum branding/logo, amount, and reference number.
${commonExtraction}

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "GCash", "paymentMethod": "gcash", "amount": 500, "referenceNumber": "10029381928", "senderName": "Juan Dela Cruz", "confidence": "high", "reason": "Valid GCash Send Money receipt."}
or
{"valid": false, "provider": null, "paymentMethod": null, "amount": null, "referenceNumber": null, "senderName": null, "confidence": "high", "reason": "This is not an e-wallet receipt. Please upload a screenshot of your completed GCash or Maya transaction."}`;
    } else if (isBank) {
      prompt = `You are a STRICT bank transfer receipt validator and parser for a church giving mobile app in the Philippines.

Task: Determine if the image is a REAL, completed bank transfer confirmation from a Philippine bank (BDO, BPI, UnionBank, Metrobank, Landbank, PNB, RCBC, etc.).

STRICTLY REJECT (valid: false):
- E-wallet receipts (GCash, Maya, Maribank)
- Selfies, portraits, scenery, food, objects, pets, memes, chat conversations, IDs
- Banking HOME screens, balance screens, or dashboards
- Physical paper receipts or ATM slips

The image MUST show a completed bank transfer with bank branding/logo, amount, and reference/transaction number.
${commonExtraction}

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "BDO", "paymentMethod": "bank", "amount": 1000, "referenceNumber": "0012938491", "senderName": "Juan Dela Cruz", "confidence": "high", "reason": "Valid BDO transfer confirmation detected."}
or
{"valid": false, "provider": null, "paymentMethod": null, "amount": null, "referenceNumber": null, "senderName": null, "confidence": "high", "reason": "This is not a bank transfer receipt. Please upload a screenshot of your completed bank transfer."}`;
    } else {
      prompt = `You are a STRICT payment receipt validator and parser for a church giving mobile app in the Philippines.

Task: Determine if the image is a REAL, completed transaction receipt from a Philippine e-wallet or bank app.
Accept: GCash, Maya, Maribank, BDO, BPI, UnionBank, Metrobank, Landbank, PNB, RCBC, etc.

STRICTLY REJECT (valid: false):
- Random photos (selfies, scenery, food, pets, memes, chat conversations, IDs)
- Home screens, balance screens, or blank forms
- Physical paper receipts or ATM slips

The image MUST show a completed payment with provider logo, amount, and reference number.
${commonExtraction}

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "GCash", "paymentMethod": "gcash", "amount": 500, "referenceNumber": "10029381928", "senderName": "Juan Dela Cruz", "confidence": "high", "reason": "Valid payment receipt detected."}
or
{"valid": false, "provider": null, "paymentMethod": null, "amount": null, "referenceNumber": null, "senderName": null, "confidence": "high", "reason": "This is not a valid payment receipt. Please upload a screenshot of your completed transaction."}`;
    }

    const modelSlugs = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
    let result = null;
    let lastError = null;

    for (const slug of modelSlugs) {
      try {
        const model = genAI.getGenerativeModel({ model: slug });
        result = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType, data: rawBase64 } },
        ]);
        if (result && result.response) break;
      } catch (err) {
        lastError = err;
        console.warn(`[Receipt Verify] Model ${slug} failed:`, err.message || err);
      }
    }

    if (!result || !result.response) {
      console.error("[Receipt Verify] All models failed:", lastError?.message || lastError);
      return res.json({
        valid: false,
        provider: null,
        confidence: "low",
        reason: "Receipt verification service error. Please try again.",
      });
    }

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      const isValid = Boolean(parsed.valid);
      return res.json({
        valid: isValid,
        provider: isValid ? (parsed.provider || "Payment Receipt") : null,
        paymentMethod: isValid ? (parsed.paymentMethod || (isBank ? "bank" : "gcash")) : null,
        amount: isValid && parsed.amount ? Number(parsed.amount) : null,
        referenceNumber: isValid && parsed.referenceNumber ? String(parsed.referenceNumber) : null,
        senderName: isValid ? (parsed.senderName || null) : null,
        confidence: parsed.confidence || (isValid ? "high" : "low"),
        reason: parsed.reason || (isValid
          ? "Valid payment receipt detected."
          : "The image does not appear to be a valid payment receipt."),
      });
    } catch {
      console.error("[Receipt Verify] Gemini returned non-JSON:", rawText);
      return res.json({
        valid: false,
        provider: null,
        confidence: "low",
        reason: "Could not verify the image. Please upload a clearer screenshot of your receipt.",
      });
    }
  } catch (err) {
    console.error("[Receipt Verify] Error:", err.message || err);
    return res.json({
      valid: false,
      provider: null,
      confidence: "low",
      reason: "Receipt verification encountered an error. Please try again.",
    });
  }
}
