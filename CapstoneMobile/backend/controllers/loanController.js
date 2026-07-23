import { body, validationResult } from "express-validator";
import Loan from "../models/Loan.js";
import User from "../models/User.js";
import { sendPushNotification } from "../utils/pushNotifications.js";

/**
 * Validation rules for loan creation
 */
export const createLoanValidation = [
  body("amount")
    .isFloat({ min: 1, max: 5000000 })
    .withMessage("Loan amount must be between 1 and 5,000,000."),
  body("purpose").trim().notEmpty().withMessage("Purpose is required."),
];

/**
 * POST /api/loans OR /api/loans/apply — Create a new loan application
 */
export async function createLoan(req, res) {
  console.log("RECEIVED LOAN APPLICATION REQUEST");
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    console.log("Validation passed. Payload:", Object.keys(req.body));

    const email = req.user.email;
    const {
      amount, purpose, phoneNumber,
      loanType, type,
      disbursementMethod, accountNumber,
    } = req.body;

    // ── One-loan-at-a-time policy ──────────────────────────────────
    const existingLoan = await Loan.findOne({
      email,
      status: { $in: ["pending", "approved", "member_accepted", "active"] },
    });
    if (existingLoan) {
      return res.status(409).json({
        message: `You already have an active loan application (${existingLoan.loanId}). Only one loan at a time is allowed.`,
      });
    }

    // Accept both field names from frontend
    const finalType = loanType || type || "personal";
    const termMonths = req.body.termMonths || req.body.monthsToPay;

    if (!termMonths || termMonths < 3 || termMonths > 12) {
      return res.status(400).json({ message: "Term months must be between 3 and 12." });
    }

    // Look up memberName from User collection
    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = user ? (user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Member") : "Member";

    // Dynamic interest rate based on loan type
    let interestRate = 0.01; // Short-term = 1%
    const typeLower = finalType.toLowerCase();
    if (typeLower === "emergency") interestRate = 0.015;
    if (typeLower === "personal") interestRate = 0.02;

    const totalInterest = amount * interestRate * termMonths;
    const totalRepayment = amount + totalInterest;
    const monthlyPayment = parseFloat((totalRepayment / termMonths).toFixed(2));

    // Generate loan ID: LN-YYYY-XXX (global sequential, matching Admin format)
    const year = new Date().getFullYear();
    const count = await Loan.countDocuments({});
    const loanId = `LN-${year}-${String(count + 1).padStart(3, "0")}`;

    const appliedDate = new Date();

    // Accept all document data from frontend (base64 strings)
    const selfieData   = req.body.selfieData   || "";
    const idData       = req.body.idData       || "";
    const coeData      = req.body.coeData      || "";
    const itrData      = req.body.itrData      || "";
    const payslipData  = req.body.payslipData  || "";

    const loan = await Loan.create({
      email,
      memberName,
      loanId,
      loanType: finalType,
      amount,
      purpose,
      phoneNumber: phoneNumber || "",
      termMonths,
      interestRate,
      interestAmount: totalInterest,
      totalInterest,
      totalRepayment,
      monthlyPayment,
      remainingBalance: totalRepayment,
      status: "pending",
      statusHistory: [{ status: "pending", date: appliedDate }],
      paidMonths: 0,
      disbursed: false,
      disbursementMethod: disbursementMethod || "",
      accountNumber: accountNumber || "",
      selfieData,
      idData,
      coeData,
      itrData,
      payslipData,
      appliedDate,
    });

    if (user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Loan Application Submitted",
        `Your application for a ₱${amount.toLocaleString()} ${finalType} loan is under review.`,
        { screen: "Loans", category: "loan" }
      ).catch(err => console.error("Push error:", err));
    }

    return res.status(201).json({
      message: "Loan application submitted successfully.",
      loan: {
        _id: loan._id,
        loanId: loan.loanId,
        loanType: loan.loanType,
        amount: loan.amount,
        status: loan.status,
        monthlyPayment: loan.monthlyPayment,
        totalRepayment: loan.totalRepayment,
        totalInterest: loan.totalInterest,
        remainingBalance: loan.remainingBalance,
        appliedDate: loan.appliedDate,
      },
    });
  } catch (err) {
    console.error("CREATE LOAN ERROR:", err);
    return res.status(500).json({ message: "Failed to submit loan application." });
  }
}

/**
 * GET /api/loans — Get all loans for authenticated user
 */
export async function getLoans(req, res) {
  try {
    const email = req.user.email;
    const loans = await Loan.find({ email })
      .sort({ createdAt: -1 })
      .select("-__v -selfieData -idData");

    return res.json({ loans });
  } catch (err) {
    console.error("GET LOANS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch loans." });
  }
}

/**
 * GET /api/loans/:id — Get a single loan by loanId
 */
export async function getLoanById(req, res) {
  try {
    const email = req.user.email;
    const loan = await Loan.findOne({ email, loanId: req.params.id }).select("-__v");

    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    return res.json({ loan });
  } catch (err) {
    console.error("GET LOAN ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch loan." });
  }
}

/**
 * PUT /api/loans/:id/accept — Member accepts an approved loan
 * Transitions: approved → member_accepted
 */
export async function acceptLoan(req, res) {
  try {
    const email = req.user.email;
    const loan = await Loan.findOne({ email, loanId: req.params.id });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    if (loan.status !== "approved") {
      return res.status(400).json({ message: `Cannot accept a loan with status "${loan.status}". Only approved loans can be accepted.` });
    }

    loan.status = "member_accepted";
    loan.statusHistory.push({ status: "member_accepted", date: new Date() });
    await loan.save();

    // Notify the member
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Loan Accepted",
        `You have accepted the ${loan.loanType} loan of ₱${loan.amount.toLocaleString()}. Awaiting disbursement.`,
        { screen: "Loans", category: "loan" }
      ).catch(err => console.error("Push error:", err));
    }

    return res.json({
      message: "Loan accepted successfully. Awaiting disbursement by secretary.",
      loan: {
        loanId: loan.loanId,
        status: loan.status,
      },
    });
  } catch (err) {
    console.error("ACCEPT LOAN ERROR:", err);
    return res.status(500).json({ message: "Failed to accept loan." });
  }
}

/**
 * PUT /api/loans/:id/status — Update loan status (admin or system use)
 * Body: { status, amount?, termMonths? }
 * 
 * When status = "approved":
 *   - If amount or termMonths differ from the original application, mark adminModified = true,
 *     keep status as "approved" so the member must accept/agree.
 *   - If nothing changed, auto-skip the agreement step and set status to "member_accepted".
 */
export async function updateLoanStatus(req, res) {
  try {
    const { status, amount: newAmount, termMonths: newTermMonths } = req.body;
    const validStatuses = ["pending", "approved", "member_accepted", "active", "completed", "rejected"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const loan = await Loan.findOne({ loanId: req.params.id });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    // ── Handle "approved" with modification detection ──────────────
    if (status === "approved") {
      const incomingAmount = newAmount != null ? Number(newAmount) : loan.amount;
      const incomingTermMonths = newTermMonths != null ? Number(newTermMonths) : loan.termMonths;

      const amountChanged = incomingAmount !== loan.amount;
      const termChanged = incomingTermMonths !== loan.termMonths;
      const wasModified = amountChanged || termChanged;

      if (wasModified) {
        // Store the member's original values so the mobile app can show what changed
        loan.originalAmount = loan.amount;
        loan.originalTermMonths = loan.termMonths;
        loan.adminModified = true;

        // Apply the admin's new values
        loan.amount = incomingAmount;
        loan.termMonths = incomingTermMonths;

        // Recalculate financial fields with the new values
        let interestRate = 0.01;
        const typeLower = (loan.loanType || "").toLowerCase();
        if (typeLower === "emergency") interestRate = 0.015;
        if (typeLower === "personal") interestRate = 0.02;

        const totalInterest = loan.amount * interestRate * loan.termMonths;
        const totalRepayment = loan.amount + totalInterest;
        const monthlyPayment = parseFloat((totalRepayment / loan.termMonths).toFixed(2));

        loan.interestRate = interestRate;
        loan.interestAmount = totalInterest;
        loan.totalInterest = totalInterest;
        loan.totalRepayment = totalRepayment;
        loan.monthlyPayment = monthlyPayment;
        loan.remainingBalance = totalRepayment;

        // Keep status as "approved" — member must accept
        loan.status = "approved";
        loan.approvedDate = new Date();
        loan.statusHistory.push({ status: "approved", date: new Date() });

        await loan.save();

        // Notify member that their loan was approved WITH modifications
        const user = await User.findOne({ email: loan.email.toLowerCase() });
        if (user && user.expoPushToken) {
          let changeDetails = [];
          if (amountChanged) changeDetails.push(`Amount: ₱${loan.originalAmount.toLocaleString()} → ₱${loan.amount.toLocaleString()}`);
          if (termChanged) changeDetails.push(`Term: ${loan.originalTermMonths} → ${loan.termMonths} months`);
          sendPushNotification(
            user.expoPushToken,
            "Loan Approved — Review Required",
            `Your ${loan.loanType} loan has been approved with modifications (${changeDetails.join(", ")}). Please review and accept the updated terms.`,
            { screen: "Loans", category: "loan" }
          ).catch(err => console.error("Push error:", err));
        }

        return res.json({
          message: `Loan approved with modifications. Member acceptance required.`,
          loan: {
            loanId: loan.loanId,
            status: loan.status,
            adminModified: loan.adminModified,
            originalAmount: loan.originalAmount,
            originalTermMonths: loan.originalTermMonths,
            amount: loan.amount,
            termMonths: loan.termMonths,
            monthlyPayment: loan.monthlyPayment,
            totalRepayment: loan.totalRepayment,
          },
        });
      } else {
        // ── No modifications → auto-accept on behalf of member ──
        loan.adminModified = false;
        loan.originalAmount = null;
        loan.originalTermMonths = null;
        loan.status = "member_accepted";
        loan.approvedDate = new Date();
        loan.statusHistory.push({ status: "approved", date: new Date() });
        loan.statusHistory.push({ status: "member_accepted", date: new Date() });

        await loan.save();

        // Notify member that their loan was approved and auto-accepted
        const user = await User.findOne({ email: loan.email.toLowerCase() });
        if (user && user.expoPushToken) {
          sendPushNotification(
            user.expoPushToken,
            "Loan Approved! ✅",
            `Your ${loan.loanType} loan of ₱${loan.amount.toLocaleString()} has been approved. Awaiting disbursement by the secretary.`,
            { screen: "Loans", category: "loan" }
          ).catch(err => console.error("Push error:", err));
        }

        return res.json({
          message: `Loan approved and auto-accepted (no modifications).`,
          loan: {
            loanId: loan.loanId,
            status: loan.status,
            adminModified: false,
            disbursed: loan.disbursed,
          },
        });
      }
    }

    // ── Handle all other status transitions (active, rejected, etc.) ──
    loan.status = status;
    loan.statusHistory.push({ status, date: new Date() });

    if (status === "active") {
      loan.disbursed = true;
      loan.disbursedDate = new Date();

      // Calculate first payment date (next month)
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      loan.nextPayment = `${nextMonth.getMonth() + 1}/${nextMonth.getDate()}/${nextMonth.getFullYear()}`;

      // Notify member that funds have been released
      const user = await User.findOne({ email: loan.email.toLowerCase() });
      if (user && user.expoPushToken) {
        sendPushNotification(
          user.expoPushToken,
          "Loan Disbursed! 🎉",
          `Your ${loan.loanType} loan of ₱${loan.amount.toLocaleString()} has been released. Your first payment of ₱${loan.monthlyPayment.toLocaleString()} is due next month.`,
          { screen: "Loans", category: "loan" }
        ).catch(err => console.error("Push error:", err));
      }
    }

    if (status === "rejected") {
      const user = await User.findOne({ email: loan.email.toLowerCase() });
      if (user && user.expoPushToken) {
        sendPushNotification(
          user.expoPushToken,
          "Loan Application Rejected",
          `Your ${loan.loanType} loan application for ₱${loan.amount.toLocaleString()} has been rejected.`,
          { screen: "Loans", category: "loan" }
        ).catch(err => console.error("Push error:", err));
      }
    }

    await loan.save();

    return res.json({
      message: `Loan status updated to "${status}".`,
      loan: {
        loanId: loan.loanId,
        status: loan.status,
        disbursed: loan.disbursed,
      },
    });
  } catch (err) {
    console.error("UPDATE LOAN STATUS ERROR:", err);
    return res.status(500).json({ message: "Failed to update loan status." });
  }
}

