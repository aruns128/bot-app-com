import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const adminAuthRoutes = Router();

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * POST /admin/auth/login
 * body: { email, password }
 * env:
 *  ADMIN_EMAIL
 *  ADMIN_PASSWORD_HASH  (bcrypt hash)
 *  JWT_SECRET
 */
adminAuthRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const adminEmail = mustEnv("ADMIN_EMAIL");
    const adminHash = mustEnv("ADMIN_PASSWORD_HASH");
    const jwtSecret = mustEnv("JWT_SECRET");

    if (String(email).toLowerCase() !== String(adminEmail).toLowerCase()) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, adminHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { role: "admin", email: adminEmail },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

/**
 * GET /admin/auth/me
 * Header: Authorization: Bearer <token>
 */
adminAuthRoutes.get("/me", (req, res) => {
  try {
    const jwtSecret = mustEnv("JWT_SECRET");

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, jwtSecret);
    return res.json({ ok: true, user: payload });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});
