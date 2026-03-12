import jwt from "jsonwebtoken";

const JWT_SECRET  = process.env.JWT_SECRET  || "dev-secret-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1h";

/**
 * สร้าง JWT Token
 * @param {object} payload
 * @returns {string}
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * ตรวจสอบ JWT Token
 * @param {string} token
 * @returns {object}
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}