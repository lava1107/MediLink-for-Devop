import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const categories = await query(
      `SELECT c.id, c.name, c.description, c.status,
              c.created_at AS created,
              COUNT(m.id) AS medicineCount
       FROM categories c
       LEFT JOIN medicines m ON m.category_id = c.id
       GROUP BY c.id
       ORDER BY c.id ASC`
    );
    return success(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const categories = await query(
      `SELECT id, name, description, status, created_at AS created
       FROM categories
       WHERE id = ?`,
      [id]
    );
    if (categories.length === 0) {
      return error(res, "Category not found", 404);
    }
    return success(res, categories[0]);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description, status } = req.body;
    if (!name) {
      return error(res, "Category name is required.", 400);
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM categories");
    const newId = `CAT-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO categories (id, name, description, status)
       VALUES (?, ?, ?, ?)`,
      [newId, name, description || "", status || "Active"]
    );

    const [created] = await query("SELECT id, name, description, status, created_at AS created FROM categories WHERE id = ?", [newId]);
    return success(res, created, "Category created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const existing = await query("SELECT id FROM categories WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Category not found", 404);
    }

    await query(
      `UPDATE categories
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name ?? null, description ?? null, status ?? null, id]
    );

    const [updated] = await query("SELECT id, name, description, status, created_at AS created FROM categories WHERE id = ?", [id]);
    return success(res, updated, "Category updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM categories WHERE id = ?", [id]);
    return success(res, { id }, "Category deleted successfully");
  } catch (err) {
    next(err);
  }
}
