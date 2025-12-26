import { generateInvoicePDF } from "./invoiceGenerator.js";
import path from "path";

export async function generateAndSendInvoice({
  phone,
  orderId,
  items,
  total,
  address,
  paidAt,
  whatsapp,
  publicBaseUrl // e.g., https://yourdomain.com  OR http://localhost:3000 in simulator
}) {
  // 1) Generate PDF locally
  const filePath = await generateInvoicePDF({
    orderId,
    phone,
    items,
    total,
    address,
    paidAt
  });

  // 2) Build public URL for download
  // (Your invoiceRoutes serves it from /invoice/:orderId.pdf)
  const invoiceUrl = `${publicBaseUrl}/invoice/${orderId}.pdf`;
  const filename = `${orderId}.pdf`;

  // 3) Send invoice using provider
  // In mock: just logs
  // In real: sends document message
  await whatsapp.sendDocument(
    phone,
    invoiceUrl,
    filename,
    `🧾 Invoice for order ${orderId} (Total ₹${total})`
  );

  // Also send a text fallback link (useful for both)
  await whatsapp.sendText(phone, `✅ Invoice ready: ${invoiceUrl}`);

  return { filePath, invoiceUrl };
}
