import SavingsTransaction from "../models/SavingsTransaction.js";
import SavingsGoal from "../models/SavingsGoal.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { generatePaymentLink } from "../utils/paymongo.js";

/**
 * POST /api/savings/deposit — Record a new savings deposit
 */
export async function createSavingsDeposit(req, res) {
  try {
    const email = req.user.email;
    const { amount, goalId, goalName, goalTarget, note, method, status, proofOfPayment } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = user ? (user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Unknown Member") : "Unknown Member";

    // Bridge the local string ID to a real MongoDB ObjectId
    let realGoalId = mongoose.isValidObjectId(goalId) ? goalId : undefined;
    let fallbackName = goalName || "My Savings";

    // If local ID isn't valid, find or create the goal on the backend!
    if (!realGoalId) {
      let goal = await SavingsGoal.findOne({ email, name: fallbackName });
      if (!goal) {
        goal = await SavingsGoal.create({
          email,
          memberName,
          name: fallbackName,
          targetAmount: goalTarget || amount * 10 || 1000,
        });
      }
      realGoalId = goal._id;
    }

    // Create reference number based on count or date
    const count = await SavingsTransaction.countDocuments({ email });
    const referenceNumber = `SD-${Date.now().toString().slice(-6)}-${count + 1}`;

    const deposit = await SavingsTransaction.create({
      email,
      memberName,
      goalId: realGoalId,
      goalName: fallbackName,
      amount,
      type: "deposit",
      description: note || "Savings Deposit",
      source: "Manual",
      paymentMethod: method || "Bank Transfer",
      status: status || "pending",
      proofOfPayment: proofOfPayment || "",
      referenceNumber,
    });

    if (!req.body.successUrl && user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Deposit Request Submitted",
        `Your deposit of ₱${deposit.amount.toLocaleString()} is pending validation.`,
        { screen: "Savings", category: "transaction" }
      ).catch((err) => console.error("Push error:", err));
    }

    const responsePayload = {
      message: "Deposit recorded smoothly.",
      deposit,
    };

    if (req.body.successUrl && req.body.cancelUrl) {
      try {
        const session = await generatePaymentLink(
          amount,
          `Savings Deposit: ${fallbackName}`,
          referenceNumber,
          method,
          req.body.successUrl,
          req.body.cancelUrl,
          { email, name: memberName }
        );
        responsePayload.checkoutUrl = session.attributes.checkout_url;
      } catch (pmError) {
        console.error("PayMongo integration failed:", pmError);
        return res.status(500).json({ message: "Payment Gateway Error. Please try again." });
      }
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error("CREATE DEPOSIT ERROR:", err);
    return res.status(500).json({ message: "Failed to process deposit." });
  }
}

/**
 * POST /api/savings/transfer — Log internal transfer
 */
export async function createSavingsTransfer(req, res) {
  try {
    const email = req.user.email;
    const { amount, fromGoalId, toGoalId, goalName, goalTarget, status } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid transfer amount." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = user ? (user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Unknown Member") : "Unknown Member";

    let realGoalId = mongoose.isValidObjectId(toGoalId) ? toGoalId : undefined;
    let fallbackName = goalName || "Transferred Goal";

    if (!realGoalId) {
      let goal = await SavingsGoal.findOne({ email, name: fallbackName });
      if (!goal) {
        goal = await SavingsGoal.create({
          email,
          memberName,
          name: fallbackName,
          targetAmount: goalTarget || amount * 5 || 1000,
        });
      }
      realGoalId = goal._id;
    }

    const count = await SavingsTransaction.countDocuments({ email });
    const referenceNumber = `ST-${Date.now().toString().slice(-6)}-${count + 1}`;

    const transfer = await SavingsTransaction.create({
      email,
      memberName,
      amount,
      type: "deposit", // It enters the 'toGoal' as a deposit in terms of transaction log, or could be 'transfer'
      goalId: realGoalId,
      goalName: fallbackName,
      description: "Goal Transfer",
      source: "Transfer",
      paymentMethod: "Internal",
      status: status || "pending",
      referenceNumber,
    });

    return res.status(201).json({
      message: "Transfer recorded smoothly.",
      transfer,
    });
  } catch (err) {
    console.error("CREATE TRANSFER ERROR:", err);
    return res.status(500).json({ message: "Failed to process transfer." });
  }
}

/**
 * GET /api/savings — Get all savings activities and goals
 */
export async function getSavings(req, res) {
  try {
    const email = req.user.email;
    const savings = await SavingsTransaction.find({ email }).sort({ createdAt: -1 });
    const goals = await SavingsGoal.find({ email }).sort({ createdAt: -1 });
    return res.json({ savings, goals });
  } catch (err) {
    console.error("GET SAVINGS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch savings data." });
  }
}

/**
 * POST /api/savings/goals — Create a new savings goal explicitly
 */
export async function createSavingsGoal(req, res) {
  try {
    const email = req.user.email;
    const { name, targetAmount } = req.body;
    
    if (!name || !targetAmount || targetAmount <= 0) {
      return res.status(400).json({ message: "Invalid goal details." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = user ? (user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Unknown Member") : "Unknown Member";

    const goal = await SavingsGoal.create({
      email,
      memberName,
      name,
      targetAmount,
      savedAmount: 0,
      status: "active"
    });

    return res.status(201).json({ message: "Savings goal created successfully.", goal });
  } catch (err) {
    console.error("CREATE GOAL ERROR:", err);
    return res.status(500).json({ message: "Failed to create savings goal." });
  }
}

/**
 * POST /api/savings/withdraw — Record a savings withdrawal
 */
export async function createSavingsWithdrawal(req, res) {
  try {
    const email = req.user.email;
    const { amount, goalId, goalName, reason, sendMethod, accountNumber, accountName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal amount." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = user
      ? (user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Unknown Member")
      : "Unknown Member";

    // Resolve goal
    let realGoalId = mongoose.isValidObjectId(goalId) ? goalId : undefined;
    let fallbackName = goalName || "My Savings";

    if (!realGoalId) {
      let goal = await SavingsGoal.findOne({ email, name: fallbackName });
      if (!goal) {
        return res.status(404).json({ success: false, message: "Savings goal not found." });
      }
      realGoalId = goal._id;
      fallbackName = goal.name;
    }

    // Check sufficient balance
    const goal = await SavingsGoal.findById(realGoalId);
    if (goal && (goal.savedAmount || 0) < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₱${(goal.savedAmount || 0).toLocaleString()}`,
      });
    }

    const count = await SavingsTransaction.countDocuments({ email });
    const referenceNumber = `SW-${Date.now().toString().slice(-6)}-${count + 1}`;

    const withdrawal = await SavingsTransaction.create({
      email,
      memberName,
      goalId: realGoalId,
      goalName: fallbackName,
      amount,
      type: "withdrawal",
      description: reason || "Savings Withdrawal",
      source: sendMethod || "e-wallet",
      paymentMethod: sendMethod || "e-wallet",
      status: "confirmed", // Withdrawals are immediately confirmed per API spec
      referenceNumber,
      accountName: accountName || "",
      accountNumber: accountNumber || "",
    });

    // Deduct from goal savedAmount
    if (goal) {
      await SavingsGoal.findByIdAndUpdate(realGoalId, {
        $inc: { savedAmount: -amount },
      });
    }

    // Push notification
    if (user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Withdrawal Processed",
        `₱${amount.toLocaleString()} has been withdrawn from ${fallbackName}.`,
        { screen: "Savings", category: "transaction" }
      ).catch((err) => console.error("Push error:", err));
    }

    return res.status(201).json({
      success: true,
      message: `₱${amount.toLocaleString()} withdrawn successfully from ${fallbackName}`,
      withdrawal,
    });
  } catch (err) {
    console.error("CREATE WITHDRAWAL ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal." });
  }
}
