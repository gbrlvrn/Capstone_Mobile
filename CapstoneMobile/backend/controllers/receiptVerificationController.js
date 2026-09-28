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
        reason: "Receipt verification service unavailable. Please try again later.",
      });
    }

    // Strip data URI prefix if present so we send raw base64 to Gemini
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

    // Build strict prompt based on payment method
    const method = (paymentMethod || "").toLowerCase();
    const isEwallet = method === "gcash" || method === "maya" || method === "e-wallet" || method === "ewallet";
    const isBank = method === "bank" || method === "bank_transfer" || method === "bank transfer";

    let prompt;
    if (isEwallet) {
      prompt = `You are a STRICT e-wallet receipt validator for a mobile app in the Philippines.

Task: Determine if the image is a REAL, completed transaction receipt from a Philippine e-wallet app.

ONLY accept receipts from these e-wallet providers:
- **GCash** — Must show: GCash logo/branding (blue/green theme), "Send Money" / "Pay Bills" / "Cash In" / "Express Send" label, transaction reference number, sender & receiver names/numbers, amount with peso sign (₱), date & time stamp.
- **Maya (PayMaya)** — Must show: Maya logo/branding (green), "Send Money" / "Pay" labels, transaction reference number, sender & receiver details, amount, date & time.
- **Maribank** — Must show: Maribank branding, transaction confirmation screen, reference number, amount, date & time.

STRICTLY REJECT — return valid: false for ALL of the following:
- Bank transfer confirmations or online banking screenshots (BDO, BPI, Metrobank, etc.) — these are NOT e-wallet receipts
- Selfies, portraits, photos of people, scenery, food, objects, pets, furniture, vehicles
- Memes, social media screenshots, chat conversations, games
- Non-receipt documents (IDs, certificates, letters, invoices, forms)
- Blank or solid-color images
- Screenshots of e-wallet HOME screens, balance screens, or anything that is NOT a completed transaction
- Physical paper receipts or ATM slips
- Receipts from non-Philippine providers
- Heavily edited or fabricated receipts

The image MUST show a completed e-wallet transaction with at minimum: (a) e-wallet branding/logo, (b) transaction amount, (c) reference/transaction number.

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "GCash", "confidence": "high", "reason": "Valid GCash Send Money receipt with reference number and amount visible."}
or
{"valid": false, "provider": null, "confidence": "high", "reason": "This is not an e-wallet receipt. Please upload a screenshot of your completed GCash, Maya, or Maribank transaction."}`;
    } else if (isBank) {
      prompt = `You are a STRICT bank transfer receipt validator for a mobile app in the Philippines.

Task: Determine if the image is a REAL, completed bank transfer confirmation from a Philippine bank's online/mobile banking app.

ONLY accept receipts from recognized Philippine banks:
- **BDO** — BDO Online/Mobile Banking transfer confirmation, "Fund Transfer" / "Send Money" labels
- **BPI** — BPI Online/Mobile app transfer confirmation, "Transfer" / "Send Money" labels
- **UnionBank** — UnionBank Online transfer receipt
- **Metrobank** — Metrobank app transfer confirmation
- **Landbank** — Landbank iAccess/Mobile Banking transfer confirmation
- **PNB** — PNB Digital Banking transfer confirmation
- **RCBC, Security Bank, Chinabank, EastWest, PSBank, AUB, CTBC** or any other recognized Philippine bank

Each must show: bank logo/branding, "Fund Transfer" / "Send Money" / "Transfer" labels, reference/transaction number, amount, date & time.

STRICTLY REJECT — return valid: false for ALL of the following:
- E-wallet receipts (GCash, Maya, Maribank) — these are NOT bank transfer receipts
- Selfies, portraits, photos of people, scenery, food, objects, pets, furniture, vehicles
- Memes, social media screenshots, chat conversations, games
- Non-receipt documents (IDs, certificates, letters, invoices, forms)
- Blank or solid-color images
- Screenshots of banking HOME screens, balance screens, or dashboards that are NOT a completed transfer
- Physical paper receipts or ATM slips
- Receipts from non-Philippine providers
- Heavily edited or fabricated receipts

The image MUST show a completed bank transfer with at minimum: (a) bank branding/logo, (b) transfer amount, (c) reference/transaction number.

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "BDO", "confidence": "high", "reason": "Valid BDO Online Banking fund transfer confirmation detected."}
or
{"valid": false, "provider": null, "confidence": "high", "reason": "This is not a bank transfer receipt. Please upload a screenshot of your completed bank transfer from your banking app."}`;
    } else {
      prompt = `You are a STRICT payment receipt validator for a mobile app in the Philippines.

Task: Determine if the image is a REAL, completed transaction receipt from a Philippine e-wallet or bank app.

ONLY accept receipts from:
- E-wallets: GCash, Maya/PayMaya, Maribank
- Banks: BDO, BPI, UnionBank, Metrobank, Landbank, PNB, RCBC, Security Bank, Chinabank, EastWest, PSBank, or any recognized Philippine bank

Each must show: provider branding/logo, transaction amount, reference/transaction number, date & time.

STRICTLY REJECT:
- Random photos (selfies, scenery, food, objects, pets, memes, games, social media)
- Non-receipt documents (IDs, certificates, letters)
- Blank images, home screens, balance screens, dashboards
- Physical receipts or ATM slips
- Receipts from non-Philippine providers
- Fabricated or heavily edited receipts

Output Format: Respond ONLY with raw JSON:
{"valid": true, "provider": "GCash", "confidence": "high", "reason": "Valid GCash receipt detected."}
or
{"valid": false, "provider": null, "confidence": "high", "reason": "This is not a valid payment receipt. Please upload a screenshot of your completed transaction."}`;
    }

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
