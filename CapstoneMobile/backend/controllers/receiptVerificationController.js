import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * POST /api/donations/verify-receipt
 * Body: { base64: string, mimeType?: string }
 *
 * Uses Gemini Vision to verify whether an uploaded image is a legitimate
 * e-wallet payment receipt from GCash, Maya/PayMaya, or Maribank.
 * Returns: { valid: boolean, provider: string|null, confidence: string, reason: string }
 */
export async function verifyReceipt(req, res) {
  try {
    const { base64, mimeType = "image/jpeg" } = req.body;

    if (!base64 || typeof base64 !== "string" || base64.trim().length < 100) {
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
        reason: "Receipt verification service unavailable. GEMINI_API_KEY is missing.",
      });
    }

    // Strip data URI prefix if present so we send raw base64 to Gemini
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a strict payment receipt verification AI for a mobile church app in the Philippines.

Task: Analyze the provided image and determine if it is a REAL, LEGITIMATE payment receipt or transaction confirmation screenshot from one of the following Philippine e-wallet or bank transfer providers:

Recognized E-Wallet Providers:
1. **GCash** — Look for: GCash logo/branding (blue), "Send Money" / "Pay Bills" / "Cash In" / "Express Send" labels, transaction reference number (13-digit or alphanumeric), sender & receiver names/numbers, amount with peso sign (₱), date & time stamp, "GCash" watermark or header.
2. **Maya (PayMaya)** — Look for: Maya/PayMaya logo/branding (green), "Send Money" / "Pay" labels, transaction reference number, sender & receiver details, amount, date & time, Maya UI elements.
3. **Maribank** — Look for: Maribank branding, transaction confirmation screen, reference number, amount, date & time.

Recognized Bank Transfer Providers:
4. **BDO** — Look for: BDO logo/branding, BDO Online/Mobile Banking transfer confirmation, "Fund Transfer" / "Send Money" / "Bills Payment" labels, reference/transaction number, amount, date & time.
5. **BPI** — Look for: BPI logo/branding, BPI Online/Mobile app transfer confirmation, "Transfer" / "Send Money" labels, reference number, amount, date & time.
6. **UnionBank** — Look for: UnionBank logo/branding, UnionBank Online transfer receipt, reference number, amount, date & time.
7. **Metrobank** — Look for: Metrobank logo/branding, Metrobank app transfer confirmation, reference number, amount, date & time.
8. **Landbank** — Look for: Landbank iAccess/Mobile Banking transfer confirmation, reference number, amount, date & time.
9. **PNB** — Look for: PNB Digital Banking transfer confirmation, reference number, amount, date & time.
10. **Other Philippine Banks** — Any other recognized Philippine bank (RCBC, Security Bank, Chinabank, EastWest, PSBank, AUB, CTBC, etc.) showing a digital transfer confirmation with bank branding, reference number, amount, and date.

STRICT EVALUATION RULES:
1. The image MUST be a screenshot of a completed transaction/payment/transfer from one of the providers listed above.
2. The receipt MUST show at minimum: (a) provider branding/logo, (b) a transaction amount, and (c) a reference number or transaction ID.
3. REJECT the following — return valid: false:
   - Random photos (selfies, scenery, food, objects, pets, furniture, vehicles)
   - Memes, social media screenshots, chat conversations
   - Non-receipt documents (IDs, certificates, letters, invoices)
   - Blank or solid-color images
   - Heavily edited or obviously fabricated receipts (mismatched fonts, blurry key fields, photoshopped elements)
   - Screenshots of e-wallet HOME screens, balance screens, bank dashboards, or anything that is NOT a completed transaction receipt
   - Physical paper receipts or ATM slips (only digital/app screenshots are accepted)
   - Receipts from providers NOT recognized as Philippine e-wallets or banks
4. If the image is a CROPPED portion of a receipt but still shows provider branding + amount + reference number, accept it.
5. If the image quality is too low to read any text or identify the provider, reject it.

Output Format: Respond ONLY with raw JSON in this exact structure:
{"valid": true, "provider": "GCash", "confidence": "high", "reason": "Valid GCash Send Money receipt detected with reference number and amount visible."}
or
{"valid": true, "provider": "BDO", "confidence": "high", "reason": "Valid BDO Online Banking fund transfer confirmation detected."}
or
{"valid": false, "provider": null, "confidence": "high", "reason": "The image does not appear to be a valid payment receipt. Please upload a screenshot of your completed transaction from GCash, Maya, Maribank, or your bank's app."}`;

    const modelSlugs = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
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
        reason: "Receipt verification AI service error. Please try again or upload a clearer screenshot.",
      });
    }

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      const isValid = Boolean(parsed.valid);
      return res.json({
        valid: isValid,
        provider: isValid ? (parsed.provider || "E-Wallet") : null,
        confidence: parsed.confidence || (isValid ? "high" : "low"),
        reason: parsed.reason || (isValid
          ? "Valid e-wallet receipt detected."
          : "The image does not appear to be a valid e-wallet payment receipt."),
      });
    } catch {
      console.error("[Receipt Verify] Gemini returned non-JSON:", rawText);
      return res.json({
        valid: false,
        provider: null,
        confidence: "low",
        reason: "Unable to analyze receipt image clearly. Please upload a clearer screenshot of your payment receipt.",
      });
    }
  } catch (err) {
    console.error("[Receipt Verify] Error:", err.message || err);
    return res.json({
      valid: false,
      provider: null,
      confidence: "low",
      reason: "Receipt verification system error. Please try again.",
    });
  }
}
