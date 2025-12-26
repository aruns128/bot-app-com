import { Router } from "express";
import fs from "fs";
import path from "path";
import { whatsapp } from "../../providers/whatsapp/index.js";
import { generateAndSendInvoice } from "../../core/invoiceService.js";
import { getConvo, saveConvo } from "../../core/cartFileStore.js";

export const adminOrdersRoutes = Router();

const CART_FILE = path.resolve(process.cwd(), "data", "carts.json");
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

function readAll() {
  console.log("Reading all orders from file:", CART_FILE);
  if (!fs.existsSync(CART_FILE)) return {};
  try {
    const raw = fs.readFileSync(CART_FILE, "utf-8") || "{}";
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading cart file:", error);
    return {};
  }
}



/**
 * GET /admin/orders?state=INVOICED&phone=...
 */
adminOrdersRoutes.get("/", (req, res) => {
  const { state, phone } = req.query;

  const all = readAll();
  let orders = Object.values(all);

  if (state) orders = orders.filter((o) => o.state === state);
  if (phone) orders = orders.filter((o) => String(o.phone).includes(String(phone)));

  orders = orders.reverse();

  res.json({ ok: true, orders });
});

/**
 * GET /admin/orders/:phone
 */
adminOrdersRoutes.get("/:phone", async (req, res) => {
  const convo = await getConvo(req.params.phone);
  res.json(convo);
});

/**
 * POST /admin/orders/:phone/resend-invoice
 */
adminOrdersRoutes.post("/:phone/resend-invoice", async (req, res) => {
  const phone = req.params.phone;
  const convo = await getConvo(phone);

  const items = Object.values(convo.context?.cart || {});
  const total =
    convo.context?.total ||
    items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);

  const orderId = convo.context?.orderId || `ORD-${phone}-${Date.now()}`;

  if (!convo.context) convo.context = {};
  convo.context.orderId = orderId;

  const paid = convo.context?.payment?.status === "paid" || convo.state === "PAID" || convo.state === "INVOICED";
  if (!paid) {
    return res.status(400).json({ ok: false, error: "Order not paid yet" });
  }

  const { invoiceUrl } = await generateAndSendInvoice({
    phone,
    orderId,
    items,
    total,
    address: convo.context.address,
    paidAt: convo.context.paidAt || new Date().toISOString(),
    paymentProvider: "Razorpay",
    whatsapp,
    publicBaseUrl,
  });

  convo.state = "INVOICED";
  convo.context.invoiceGenerated = true;
  await saveConvo(phone, convo);

  res.json({ ok: true, action: "invoice_resent", invoiceUrl, orderId });
});
