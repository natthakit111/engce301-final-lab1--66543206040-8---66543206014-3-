import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;

// จำเป็นสำหรับ __dirname ใน ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || "task-db",
  port: 5432,
  database: process.env.DB_NAME || "task_db",
  user: process.env.DB_USER || "task_user",
  password: process.env.DB_PASSWORD || "task_secret",
});

// ใช้สร้าง table ตอน container start
async function initDB() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "init.sql"),
      "utf8"
    );

    await pool.query(sql);

    console.log("[task-db] Tables initialized");
  } catch (err) {
    console.error("[task-db] Init error:", err.message);
  }
}

export { pool, initDB };