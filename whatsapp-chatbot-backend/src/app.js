import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { validateEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes.js";
import { cartRoutes } from "./modules/admin/cart.routes.js";
import { paymentRoutes } from "./modules/payment/payment.routes.js";
import { invoiceRoutes } from "./modules/invoice/invoice.routes.js";
import { adminAuthRoutes } from "./modules/admin/auth.routes.js";
import { adminOrdersRoutes } from "./modules/admin/orders.routes.js";
import { requireAdmin } from "./middlewares/adminAuth.js";

dotenv.config();
validateEnv();
await connectDB();

export const app = express();
app.use(express.json());

app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
}));


// Logger middleware for API access
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        
        // Color codes based on status
        let color = '\x1b[0m'; // Reset
        if (status >= 500) color = '\x1b[31m'; // Red
        else if (status >= 400) color = '\x1b[33m'; // Yellow
        else if (status >= 300) color = '\x1b[36m'; // Cyan
        else if (status >= 200) color = '\x1b[32m'; // Green
        
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.url} ${color}${status}\x1b[0m ${duration}ms`
        );
    });
    
    next();
});

// Health check endpoint
app.get("/", (_req, res) => {
        res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/whatsapp", whatsappRoutes);
app.use("/admin", cartRoutes);
app.use("/payment", paymentRoutes);
app.use("/invoice", invoiceRoutes);
app.use("/admin/orders", requireAdmin, adminOrdersRoutes);
app.use("/admin/auth", adminAuthRoutes);