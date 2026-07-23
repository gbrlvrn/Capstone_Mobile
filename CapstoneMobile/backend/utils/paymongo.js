import dotenv from "dotenv";
dotenv.config();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const encodedKey = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString("base64");

export const generatePaymentLink = async (
  amount,
  description,
  referenceId = "",
  paymentMethod = "",
  successUrl = "puac://payment/success",
  cancelUrl = "puac://payment/cancel",
  billing = null
) => {
  try {
    let methodTypes = ["card", "gcash", "paymaya", "dob"];
    if (paymentMethod === "E-Wallet" || paymentMethod === "e-wallet") {
      methodTypes = ["gcash", "paymaya"];
    } else if (paymentMethod === "Bank Transfer" || paymentMethod === "bank") {
      methodTypes = ["dob", "card"];
    }

    const attributes = {
      line_items: [
        {
          currency: "PHP",
          amount: Math.round(amount * 100),
          name: description,
          quantity: 1,
        },
      ],
      payment_method_types: methodTypes,
      description: description,
      reference_number: referenceId,
      send_email_receipt: true,
      show_description: true,
      show_line_items: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (billing) {
      attributes.billing = {};
      if (billing.name) attributes.billing.name = billing.name;
      if (billing.email) attributes.billing.email = billing.email;
      if (billing.phone) attributes.billing.phone = billing.phone;
    }

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { attributes } }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || "PayMongo Checkout Error");
    }

    return data.data;
  } catch (error) {
    console.error("PayMongo Checkout Error:", error);
    throw error;
  }
};
