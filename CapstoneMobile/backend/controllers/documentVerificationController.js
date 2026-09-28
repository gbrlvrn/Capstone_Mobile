import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Build a Gemini Vision prompt for a specific document type.
 */
function buildPrompt(documentType) {
  const docDescriptions = {
    coe: {
      name: "Certificate of Employment (COE)",
      criteria: `A Certificate of Employment (COE) is an official letter or document issued by an employer confirming that a person is or was employed at the company. Look for:
- Company letterhead or logo
- Employee name
- Job title / position
- Employment dates or status (e.g. "currently employed", "date hired")
- HR or authorized signatory signature
- Company stamp or seal (optional but common)
It may also be titled "Certificate of Employment", "Employment Certificate", "Employment Certification", or similar.`,
    },
    itr: {
      name: "Income Tax Return (ITR)",
      criteria: `An Income Tax Return (ITR) is an official tax document filed with the Bureau of Internal Revenue (BIR) in the Philippines. Look for:
- BIR Form number (e.g. BIR Form 2316, 1701, 1700, 1701A, 1702)
- Taxpayer name and TIN (Tax Identification Number)
- Tax computation fields (gross income, deductions, tax due)
- BIR logo, stamps, or markings
- Filing period or taxable year
It may also show "Annual Income Tax Return", "Certificate of Compensation Payment/Tax Withheld", or similar headings.`,
    },
    payslip: {
      name: "Payslip / Pay Stub",
      criteria: `A Payslip (Pay Stub) is a document issued by an employer showing the employee's earnings for a pay period. Look for:
- Employee name
- Pay period dates
- Gross pay / basic salary
- Deductions (taxes, SSS, PhilHealth, Pag-IBIG, etc.)
- Net pay / take-home pay
- Employer name or company name
It may be titled "Pay Slip", "Payslip", "Salary Slip", "Pay Statement", "Earnings Statement", or similar.`,
    },
  };

  const doc = docDescriptions[documentType];
  if (!doc) {
    return null;
  }

  return `You are a strict document verification AI for a loan application system in the Philippines.

Task: Analyze the provided image and determine if it contains a valid ${doc.name}.

${doc.criteria}

STRICT EVALUATION RULES:
1. The document MUST clearly match the type described above.
2. If the image is a selfie, portrait, random photo (scenery, food, pet, furniture, meme, screenshot of social media, blank image), return valid: false.
3. If the image is a different type of document (e.g. an ID card when expecting a payslip, a receipt when expecting a COE), return valid: false.
4. If the document is too blurry, too dark, or unreadable, return valid: false with a reason explaining the issue.
5. Only return valid: true if the image clearly contains a ${doc.name} or a very close equivalent.

Output Format: Respond ONLY with raw JSON in this exact structure:
{"valid": true, "documentType": "${documentType}", "confidence": "high", "reason": "Valid ${doc.name} detected."}
or
{"valid": false, "documentType": "${documentType}", "confidence": "high", "reason": "The image does not appear to be a valid ${doc.name}. Please upload a clear photo of your ${doc.name}."}`;
}

/**
 * POST /api/loans/verify-document
 * Body: { imageData: string (base64 or data-URI), documentType: "coe"|"itr"|"payslip" }
 *
 * Uses Gemini Vision to verify whether an uploaded image is a legitimate
 * COE, ITR, or Payslip document.
 */
export async function verifyDocument(req, res) {
  try {
    const { imageData, documentType } = req.body;

    if (!documentType || !["coe", "itr", "payslip"].includes(documentType)) {
      return res.status(400).json({
        valid: false,
        documentType: documentType || null,
        confidence: "high",
        reason: "Invalid document type. Must be one of: coe, itr, payslip.",
      });
    }

    if (!imageData || typeof imageData !== "string" || imageData.trim().length < 100) {
      return res.status(400).json({
        valid: false,
        documentType,
        confidence: "high",
        reason: "Invalid or empty image data provided. Please upload a clear photo of your document.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Doc Verify] GEMINI_API_KEY is not configured.");
      return res.json({
        valid: false,
        documentType,
        confidence: "low",
        reason: "Document verification service unavailable. GEMINI_API_KEY is missing.",
      });
    }

    // Extract raw base64 and mimeType from data-URI or plain base64
    let rawBase64 = imageData;
    let mimeType = "image/jpeg";
    const dataUriMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      rawBase64 = dataUriMatch[2];
    }

    const prompt = buildPrompt(documentType);

    const modelSlugs = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
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
        console.warn(`[Doc Verify] Model ${slug} failed:`, err.message || err);
      }
    }

    if (!result || !result.response) {
      console.error("[Doc Verify] All models failed:", lastError?.message || lastError);
      return res.json({
        valid: false,
        documentType,
        confidence: "low",
        reason: "Document verification AI service error. Please retake a clear, well-lit photo of your document.",
      });
    }

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      const isValid = Boolean(parsed.valid);
      const docNames = { coe: "Certificate of Employment", itr: "Income Tax Return", payslip: "Payslip" };
      return res.json({
        valid: isValid,
        documentType,
        confidence: parsed.confidence || (isValid ? "high" : "low"),
        reason: parsed.reason || (isValid
          ? `Valid ${docNames[documentType]} detected.`
          : `The image does not appear to be a valid ${docNames[documentType]}. Please upload a clear photo.`),
      });
    } catch {
      console.error("[Doc Verify] Gemini returned non-JSON:", rawText);
      return res.json({
        valid: false,
        documentType,
        confidence: "low",
        reason: "Unable to analyze document image clearly. Please upload a clear photo of your document.",
      });
    }
  } catch (err) {
    console.error("[Doc Verify] Error:", err.message || err);
    return res.json({
      valid: false,
      documentType: req.body?.documentType || null,
      confidence: "low",
      reason: "Document verification system error. Please try again.",
    });
  }
}
