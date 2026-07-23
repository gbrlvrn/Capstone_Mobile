import LoanPayment from "../models/LoanPayment.js";
import Loan from "../models/Loan.js";
import User from "../models/User.js";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { generatePaymentLink } from "../utils/paymongo.js";

/**
 * POST /api/loan-payments — Submit a loan repayment
 */
export async function createPayment(req, res) {
  try {
    const email = req.user.email;
    const { loanId, amount, paymentMethod, proofData, monthNumber } = req.body;

    if (!loanId) {
      return res.status(400).json({ message: "loanId is required." });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount." });
    }

    // Find the loan
    const loan = await Loan.findOne({ email, loanId });
    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    if (loan.status !== "active") {
      return res.status(400).json({ message: `Cannot make a payment on a "${loan.status}" loan. Only active loans accept payments.` });
    }

    const payment = await LoanPayment.create({
      loanId,
      loanObjectId: loan._id,
      email,
      amount,
      paymentMethod: paymentMethod || "gcash",
      proofData,
      status: "pending",
      submittedAt: new Date(),
      monthNumber: monthNumber || (loan.paidMonths + 1),
    });

    // Notify member
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!req.body.successUrl && user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Payment Submitted",
        `Your payment of ₱${amount.toLocaleString()} for loan ${loanId} is pending admin confirmation.`,
        { screen: "Loans", category: "loan" }
      ).catch(err => console.error("Push error:", err));
    }

    const responsePayload = {
      message: "Payment submitted successfully. Awaiting admin confirmation.",
      payment: {
        _id: payment._id,
        loanId: payment.loanId,
        amount: payment.amount,
        status: payment.status,
        submittedAt: payment.submittedAt,
        monthNumber: payment.monthNumber,
      },
    };

    if (req.body.successUrl && req.body.cancelUrl) {
      try {
        const session = await generatePaymentLink(
          amount,
          `Loan Repayment: ${loanId}`,
          payment._id.toString(),
          paymentMethod,
          req.body.successUrl,
          req.body.cancelUrl,
          { email, name: user ? user.fullName || user.firstName : "Member" }
        );
        responsePayload.checkoutUrl = session.attributes.checkout_url;
      } catch (pmError) {
        console.error("PayMongo integration failed:", pmError);
        return res.status(500).json({ message: "Payment Gateway Error. Please try again." });
      }
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error("CREATE PAYMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to submit payment." });
  }
}

/**
 * GET /api/loan-payments/:loanId — Get all payments for a loan
 */
export async function getPayments(req, res) {
  try {
    const email = req.user.email;
    const { loanId } = req.params;

    const payments = await LoanPayment.find({ email, loanId })
      .sort({ submittedAt: -1 })
      .select("-__v -proofData");

    return res.json({ payments });
  } catch (err) {
    console.error("GET PAYMENTS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch payments." });
  }
}
