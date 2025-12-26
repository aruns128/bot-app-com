import { Router } from "express";
import crypto from "crypto";
import { whatsapp } from "../../providers/whatsapp/index.js";
import {
  getConvo as getFileConvo,
  saveConvo as saveFileConvo,
} from "../../core/cartFileStore.js";
import { generateAndSendInvoice } from "../../core/invoiceService.js";

export const paymentRoutes = Router();

/**
 * Used to build invoice public URL:
 * - Simulator: http://localhost:3000
 * - Production: https://yourdomain.com
 */
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

/**
 * Simulator: Mark payment as success
 * POST /payment/mock-success
 * body: { phone }
 */
paymentRoutes.post("/mock-success", async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: "phone required" });

    const convo = await getFileConvo(phone);
    if (!convo?.context?.payment) {
      return res.status(400).json({ error: "no payment found for this phone" });
    }

    // Mark paid
    convo.context.payment.status = "paid";
    convo.context.paidAt = !convo?.context?.paidAt ? new Date().toISOString() : convo.context.paidAt;
    console.log(`Mock payment success for ${JSON.stringify(convo.context.paidAt)}`);

    // Ensure orderId exists
    const orderId = convo.context.orderId || `ORD-${phone}-${Date.now()}`;
    convo.context.orderId = orderId;

    // Build invoice data
    const items = Object.values(convo.context.cart || {});
    const total =
      convo.context.total ||
      items.reduce((s, x) => s + (x.price || 0) * (x.qty || 0), 0);

    // Generate + Send Invoice (common for mock + real)
    const { invoiceUrl } = await generateAndSendInvoice({
      phone,
      orderId,
      items,
      total,
      address: convo.context.address,
      paidAt: convo.context.paidAt,
      whatsapp,
      publicBaseUrl,
    });

    // Move to INVOICED
    convo.state = "INVOICED";
    await saveFileConvo(phone, convo);

    return res.json({
      ok: true,
      action: "mock_paid_and_invoiced",
      orderId,
      invoiceUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

/**
 * Real Razorpay Webhook (for production)
 * POST /payment/webhook
 * Verify signature: X-Razorpay-Signature
 */

paymentRoutes.post("/webhook", async (req, res) => {
  try {
    if (process.env.ENABLE_PAYMENT_WEBHOOK !== "true") {
      return res.status(200).json({ ignored: true });
    }

    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(400).json({ error: "Missing webhook config" });
    }

    const payload = JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (expected !== signature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body?.event;

    // Only handle successful payment
    if (event !== "payment_link.paid") {
      return res.json({ ok: true, ignored: event });
    }

    const paymentLinkId =
      req.body?.payload?.payment_link?.entity?.id;

    if (!paymentLinkId) {
      return res.status(400).json({ error: "paymentLinkId missing" });
    }

    // 🔍 Find conversation by paymentLinkId (file-based store)
    const allCarts = await getAllCarts(); // add helper if not present
    const convo = Object.values(allCarts).find(
      (c) => c.context?.paymentLinkId === paymentLinkId
    );

    if (!convo) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 🛑 Idempotency check
    if (convo.context.invoiceGenerated) {
      return res.json({ ok: true, alreadyProcessed: true });
    }

    // Mark payment paid
    convo.context.payment.status = "paid";
    convo.context.paidAt = new Date().toISOString();
    convo.state = "PAID";

    // Generate & send invoice
    const items = Object.values(convo.context.cart || {});
    const total =
      convo.context.total ||
      items.reduce((s, x) => s + x.price * x.qty, 0);

    await generateAndSendInvoice({
      phone: convo.phone,
      orderId: convo.context.orderId,
      items,
      total,
      address: convo.context.address,
      paidAt: convo.context.paidAt,
      paymentProvider: "Razorpay",
      whatsapp,
      publicBaseUrl,
    });

    convo.context.invoiceGenerated = true;
    convo.state = "INVOICED";
    await saveFileConvo(convo.phone, convo);

    return res.json({ ok: true, action: "invoice_sent" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
