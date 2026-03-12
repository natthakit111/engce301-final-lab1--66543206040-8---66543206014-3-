import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/db.js";
import { generateToken, verifyToken } from "../middleware/jwtUtils.js";

const router = express.Router();

// ── Helper: ส่ง log ไปที่ Log Service ────────────────────────────────
async function logEvent({
  service = "auth-service",
  level,
  event,
  userId,
  ip,
  method,
  path,
  statusCode,
  message,
  meta,
}) {
  try {
    await fetch("http://log-service:3003/api/logs/internal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service,
        level,
        event,
        user_id: userId,
        ip_address: ip,
        method,
        path,
        status_code: statusCode,
        message,
        meta,
      }),
    });
  } catch (err) {
    // ถ้า log service ล่ม ไม่ต้องหยุดระบบ
    console.error("[AUTH] log-service error:", err.message);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/login
// ใช้ Seed Users จาก DB เท่านั้น
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers["x-real-ip"] || req.ip;

  if (!email || !password) {
    return res.status(400).json({
      error: "กรุณากรอก email และ password",
    });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    // ป้องกัน timing attack
    const dummyHash =
      "$2b$10$invalidhashpaddinginvalidhashpaddinginvalidhashpadding00";

    const passwordHash = user ? user.password_hash : dummyHash;

    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      await logEvent({
        level: "WARN",
        event: "LOGIN_FAILED",
        ip,
        method: "POST",
        path: "/api/auth/login",
        statusCode: 401,
        message: `Login failed for: ${email}`,
        meta: { email },
      });

      return res.status(401).json({
        error: "Email หรือ Password ไม่ถูกต้อง",
      });
    }

    // update last login
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    const token = generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    await logEvent({
      level: "INFO",
      event: "LOGIN_SUCCESS",
      userId: user.id,
      ip,
      method: "POST",
      path: "/api/auth/login",
      statusCode: 200,
      message: `User ${user.username} logged in`,
      meta: {
        username: user.username,
        role: user.role,
      },
    });

    res.json({
      message: "Login สำเร็จ",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err.message);

    res.status(500).json({
      error: "Server error",
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify
// ─────────────────────────────────────────────
router.get("/verify", (req, res) => {
  const token = (req.headers["authorization"] || "").split(" ")[1];

  if (!token) {
    return res.status(401).json({
      valid: false,
      error: "No token",
    });
  }

  try {
    const decoded = verifyToken(token);

    res.json({
      valid: true,
      user: decoded,
    });
  } catch (err) {
    res.status(401).json({
      valid: false,
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const token = (req.headers["authorization"] || "").split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  try {
    const decoded = verifyToken(token);

    const result = await pool.query(
      `SELECT id, username, email, role, created_at, last_login
       FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (err) {
    res.status(401).json({
      error: "Invalid token",
    });
  }
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
router.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "auth-service",
    time: new Date(),
  });
});

export default router;