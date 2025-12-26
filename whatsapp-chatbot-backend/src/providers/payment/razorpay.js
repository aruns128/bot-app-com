import axios from "axios";

function basicAuthHeader(key, secret) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Razorpay Payment Links API
 * amount is in INR rupees, convert to paise
 */
export async function createPaymentLink({ amount, phone, referenceId }) {
  const key = process.env.RAZORPAY_KEY;
  const secret = process.env.RAZORPAY_SECRET;

  if (!key || !secret) throw new Error("Missing Razorpay credentials");

  const res = await axios.post(
    "https://api.razorpay.com/v1/payment_links",
    {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      reference_id: referenceId,
      description: `Bakery order payment - ${referenceId}`,
      customer: {
        contact: phone
      },
      notify: { sms: false, email: false },
      reminder_enable: true
    },
    {
      headers: {
        Authorization: basicAuthHeader(key, secret),
        "Content-Type": "application/json"
      }
    }
  );

  return {
    id: res.data.id,
    short_url: res.data.short_url,
    status: res.data.status
  };
}
