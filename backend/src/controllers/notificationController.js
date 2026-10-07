import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const { branchId } = req.query;
    let sql = "SELECT id, type, title, `desc`, time, `read` FROM notifications";
    const params = [];

    if (branchId) {
      sql += " WHERE branch_id = ? OR branch_id IS NULL";
      params.push(branchId);
    }

    sql += " ORDER BY id DESC";

    const notifications = await query(sql, params);
    return success(res, notifications.map((n) => ({ ...n, read: Boolean(n.read) })));
  } catch (err) {
    next(err);
  }
}

export async function toggleRead(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await query("SELECT `read` FROM notifications WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Notification not found", 404);
    }

    const currentRead = Boolean(existing[0].read);
    const newRead = !currentRead;
    await query("UPDATE notifications SET `read` = ? WHERE id = ?", [newRead ? 1 : 0, id]);

    return success(res, { id, read: newRead });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await query("UPDATE notifications SET `read` = 1");
    return success(res, null, "All notifications marked as read");
  } catch (err) {
    next(err);
  }
}
