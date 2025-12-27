import { Router } from "express";
import fs from "fs";
import { getInvoicePath } from "../../core/invoiceGenerator.js";

export const invoiceRoutes = Router();

/**
 * GET /invoice/:orderId.pdf
 * Downloads the generated invoice pdf
 */
invoiceRoutes.get("/:orderId.pdf", (req, res) => {
  const { orderId } = req.params;
  const filePath = getInvoicePath(orderId);

  console.log(`Serving invoice file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${orderId}.pdf"`);
  return res.sendFile(filePath);
});
