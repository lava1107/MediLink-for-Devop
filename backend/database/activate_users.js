import { query } from "../src/config/db.js";
import bcrypt from "bcryptjs";

async function activateAll() {
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashPharma = await bcrypt.hash("pharma123", 10);

  await query("UPDATE users SET status = 'Active', password_hash = ? WHERE role_id = 1", [hashAdmin]);
  await query("UPDATE users SET status = 'Active', password_hash = ? WHERE role_id = 2", [hashPharma]);

  // Ensure regional admin exists
  await query(
    `INSERT INTO users (id, name, username, email, password_hash, phone, role_id, branch_id, status, last_login)
     VALUES ('USR-07', 'Dr. Sundar V', 'sundar.admin', 'sundar.admin@medilink.com', ?, '+91 94441 55667', 1, 'BR-03', 'Active', '2026-08-20 09:00 AM')
     ON DUPLICATE KEY UPDATE status = 'Active', password_hash = VALUES(password_hash)`,
    [hashAdmin]
  );

  const users = await query("SELECT id, name, username, role_id, status FROM users");
  console.log("Updated active users in MySQL:");
  console.table(users);
  process.exit(0);
}

activateAll().catch((err) => {
  console.error("Error activating users:", err);
  process.exit(1);
});
