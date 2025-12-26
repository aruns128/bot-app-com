// src/core/invoiceGenerator.js
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

const INVOICE_DIR = path.resolve(process.cwd(), "data", "invoices");

export function ensureInvoiceDir() {
  if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

export function getInvoicePath(orderId) {
  ensureInvoiceDir();
  return path.join(INVOICE_DIR, `${orderId}.pdf`);
}

function formatDateTime(paidAt) {
  const d = paidAt ? new Date(paidAt) : new Date();
  return d
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}

function money(n) {
  const val = Number(n) || 0;
  return `Rs. ${val.toFixed(0)}`;
}

function ensureSpace(doc, needed = 40) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function isUrl(p) {
  return /^https?:\/\//i.test(p || "");
}

function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Logo download failed: HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function loadLogo() {
  const logoPathOrUrl = process.env.INVOICE_LOGO_PATH;
  if (!logoPathOrUrl) return null;

  try {
    if (isUrl(logoPathOrUrl)) {
      const buf = await downloadToBuffer(logoPathOrUrl);
      return { buffer: buf };
    }

    const abs = path.isAbsolute(logoPathOrUrl)
      ? logoPathOrUrl
      : path.resolve(process.cwd(), logoPathOrUrl);

    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    return { buffer: buf };
  } catch {
    return null;
  }
}

function getGstPercent() {
  const p = Number(process.env.INVOICE_GST_PERCENT);
  return Number.isFinite(p) ? p : 0;
}

function getDeliveryFee() {
  const f = Number(process.env.INVOICE_DELIVERY_FEE);
  return Number.isFinite(f) ? f : 0;
}

function getPaymentProvider(convoPaymentProvider) {
  return convoPaymentProvider || process.env.PAYMENT_PROVIDER || "UPI";
}

function getCompanyInfo() {
  return {
    name: process.env.INVOICE_COMPANY_NAME || "",
    address: process.env.INVOICE_COMPANY_ADDRESS || "",
    phone: process.env.INVOICE_COMPANY_PHONE || "",
  };
}

/**
 * Generates a receipt/invoice PDF (works for mock + real).
 * @returns {Promise<string>} absolute file path of the PDF
 */
export async function generateInvoicePDF({
  orderId,
  phone,
  items = [],
  total,
  address = {},
  paidAt,
  paymentProvider,
}) {
  const filePath = getInvoicePath(orderId);

  const subtotal = items.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
    0
  );
  const gstPercent = getGstPercent();
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const deliveryFee = getDeliveryFee();
  const grandTotal = Number.isFinite(Number(total))
    ? Number(total)
    : subtotal + gstAmount + deliveryFee;

  const paidVia = getPaymentProvider(paymentProvider);
  const companyInfo = getCompanyInfo();

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const leftX = 40;
  const rightMetaX = 360;

  // --- Logo + Header ---
  const logo = await loadLogo();
  const headerTopY = doc.y;

  if (logo?.buffer) {
    try {
      doc.image(logo.buffer, leftX, headerTopY, { fit: [90, 50] });
    } catch {
      // ignore logo errors
    }
  }

  doc.fontSize(18).font('Helvetica-Bold').text("Invoice", 0, headerTopY, {
    align: "center",
    underline: true,
  });
  doc.moveDown(0.3);

  // --- Company Info ---
  if (companyInfo.name || companyInfo.address || companyInfo.phone) {
    doc.fontSize(10).font('Helvetica-Bold');
    const companyParts = [companyInfo.name, companyInfo.address, companyInfo.phone].filter(Boolean);
    doc.text(companyParts.join(" | "), 0, doc.y, { align: "center" });
    doc.font('Helvetica');
    doc.moveDown(1);
  }

  
  // --- Meta block ---
  doc.fontSize(10);
  const metaY = doc.y;

  doc.text(`Order ID: ${orderId}`, leftX, metaY);
  doc.text(`Date: ${formatDateTime(paidAt)}`,  rightMetaX, metaY);
  // doc.text(`Phone: ${phone}`, rightMetaX, metaY);

  // doc.text(`Date: ${formatDateTime(paidAt)}`, rightMetaX, metaY + 14);
  // doc.text(`Paid Via: ${paidVia}`, rightMetaX, metaY + 28);

  doc.y = metaY + 20;

  // --- Address ---
  doc.fontSize(12).text("Delivery Address", leftX, doc.y, { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).text(`Phone: ${phone}`, leftX, doc.y);
  doc.moveDown(0.3);

  doc.fontSize(10).text(
    `Address: ${address?.house || ""}, ${address?.street || ""}, ${address?.pincode || ""}`,
    leftX,
    doc.y
  );
  doc.moveDown(1.2);

  // --- Items title ---
  doc.fontSize(12).text("Items", leftX, doc.y, { underline: true });
  doc.moveDown(0.6);

  // --- Table columns ---
  const tableLeft = leftX;
  const tableRight = 555;

  const colNameX = tableLeft;
  const colQtyX = 310;
  const colPriceX = 380;
  const colTotalX = 465;

  const colNameW = 260;
  const colQtyW = 50;
  const colPriceW = 70;
  const colTotalW = tableRight - colTotalX;

  doc.fontSize(10);
  const headerY = doc.y;

  doc.text("Name", colNameX, headerY, { width: colNameW });
  doc.text("Qty", colQtyX, headerY, { width: colQtyW, align: "right" });
  doc.text("Price", colPriceX, headerY, { width: colPriceW, align: "right" });
  doc.text("Total Amount", colTotalX, headerY, { width: colTotalW, align: "right" });

  doc.y = headerY + 18;

  doc.moveTo(tableLeft, doc.y).lineTo(tableRight, doc.y).stroke();
  doc.moveDown(0.8);

  for (const it of items) {
    ensureSpace(doc, 28);

    const name = it.name || it.itemId || "";
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const lineTotal = qty * price;

    const rowY = doc.y;

    doc.text(name, colNameX, rowY, { width: colNameW });
    doc.text(String(qty), colQtyX, rowY, { width: colQtyW, align: "right" });
    doc.text(money(price), colPriceX, rowY, { width: colPriceW, align: "right" });
    doc.text(money(lineTotal), colTotalX, rowY, { width: colTotalW, align: "right" });

    doc.y = rowY + 18;
  }

  doc.moveDown(0.2);
  doc.moveTo(tableLeft, doc.y).lineTo(tableRight, doc.y).stroke();
  doc.moveDown(1);

  // --- Totals block ---
  ensureSpace(doc, 140);

  const totalsLabelX = 360;
  const totalsValueX = 465;
  const labelW = 90;
  const valueW = 90;

  doc.fontSize(10);
  let y = doc.y;

  doc.text("Subtotal:", totalsLabelX, y, { width: labelW, align: "right" });
  doc.text(money(subtotal), totalsValueX, y, { width: valueW, align: "right" });
  y += 18;

  doc.text(`GST (${gstPercent}%):`, totalsLabelX, y, { width: labelW, align: "right" });
  doc.text(money(gstAmount), totalsValueX, y, { width: valueW, align: "right" });
  y += 18;

  doc.text("Delivery Fee:", totalsLabelX, y, { width: labelW, align: "right" });
  doc.text(money(deliveryFee), totalsValueX, y, { width: valueW, align: "right" });
  y += 22;

  doc.moveTo(totalsLabelX - 10, y).lineTo(tableRight, y).stroke();
  y += 14;

  doc.fontSize(12);
  doc.text("Grand Total:", totalsLabelX, y, { width: labelW, align: "right" });
  doc.text(money(grandTotal+gstAmount+deliveryFee), totalsValueX, y, { width: valueW, align: "right" });

  doc.y = y + 34;

  // Footer
  ensureSpace(doc, 40);
  doc.fontSize(10).text("Thank you for your order!", leftX, doc.y, { 
    width: tableRight - leftX, 
    align: "center" 
  });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}
