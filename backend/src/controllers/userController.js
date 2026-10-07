import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
              u.last_login AS lastLogin, u.created_at AS created,
              r.name AS role, b.name AS branch, b.id AS branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       ORDER BY u.id ASC`
    );
    return success(res, users);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const users = await query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
              u.last_login AS lastLogin, u.created_at AS created,
              r.name AS role, b.name AS branch, b.id AS branch_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [id]
    );
    if (users.length === 0) {
      return error(res, "User not found", 404);
    }
    return success(res, users[0]);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, username, email, phone, password, role, branch, status } = req.body;
    if (!name || !username || !email) {
      return error(res, "Name, username and email are required.", 400);
    }

    // Resolve role_id
    const roleRows = await query("SELECT id FROM roles WHERE LOWER(name) = LOWER(?)", [role || "Pharmacist"]);
    const roleId = roleRows.length > 0 ? roleRows[0].id : 2;

    // Resolve branch_id
    let branchId = "BR-01";
    if (branch) {
      const branchRows = await query("SELECT id FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?", [branch, branch]);
      if (branchRows.length > 0) branchId = branchRows[0].id;
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM users");
    const newId = `USR-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    const defaultPassword = password || "medilink123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await query(
      `INSERT INTO users (id, name, username, email, password_hash, phone, role_id, branch_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, name, username, email, passwordHash, phone || "", roleId, branchId, status || "Active"]
    );

    const [created] = await query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
              r.name AS role, b.name AS branch
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [newId]
    );

    return success(res, created, "User created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, username, email, phone, password, role, branch, status } = req.body;

    const existing = await query("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "User not found", 404);
    }

    let roleId = null;
    if (role && req.user?.role === "Admin") {
      const roleRows = await query("SELECT id FROM roles WHERE LOWER(name) = LOWER(?)", [role]);
      if (roleRows.length > 0) roleId = roleRows[0].id;
    }

    let branchId = null;
    if (branch && req.user?.role === "Admin") {
      const branchRows = await query("SELECT id FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?", [branch, branch]);
      if (branchRows.length > 0) branchId = branchRows[0].id;
    }

    const newStatus = req.user?.role === "Admin" ? (status ?? null) : null;

    let passwordHash = null;
    if (password && password.trim() !== "") {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await query(
      `UPDATE users
       SET name = COALESCE(?, name),
           username = COALESCE(?, username),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           role_id = COALESCE(?, role_id),
           branch_id = COALESCE(?, branch_id),
           status = COALESCE(?, status),
           password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
      [name ?? null, username ?? null, email ?? null, phone ?? null, roleId ?? null, branchId ?? null, newStatus, passwordHash ?? null, id]
    );

    const [updated] = await query(
      `SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
              r.name AS role, b.name AS branch
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [id]
    );

    return success(res, updated, "User updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function toggleStatus(req, res, next) {
  try {
    const { id } = req.params;
    const users = await query("SELECT status FROM users WHERE id = ?", [id]);
    if (users.length === 0) {
      return error(res, "User not found", 404);
    }

    const newStatus = users[0].status === "Active" ? "Inactive" : "Active";
    await query("UPDATE users SET status = ? WHERE id = ?", [newStatus, id]);

    return success(res, { id, status: newStatus }, `User status updated to ${newStatus}`);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM users WHERE id = ?", [id]);
    return success(res, { id }, "User deleted successfully");
  } catch (err) {
    next(err);
  }
}
