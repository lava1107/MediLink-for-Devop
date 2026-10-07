import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const branches = await query(
      `SELECT id, name, manager, address, city, state, pin, phone, email,
              opening, closing, status, staff, is_hq AS isHQ,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              created_at AS created, updated_at AS updated
       FROM branches
       ORDER BY id ASC`
    );
    return success(res, branches);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const branches = await query(
      `SELECT id, name, manager, address, city, state, pin, phone, email,
              opening, closing, status, staff, is_hq AS isHQ,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              created_at AS created, updated_at AS updated
       FROM branches
       WHERE id = ?`,
      [id]
    );
    if (branches.length === 0) {
      return error(res, "Branch not found", 404);
    }
    return success(res, branches[0]);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, manager, address, city, state, pin, phone, email, opening, closing, status, staff, isHQ, lat, lng } = req.body;
    if (!name || !address || !city || !state || !pin || !phone || lat === undefined || lng === undefined) {
      return error(res, "Missing required branch fields.", 400);
    }

    // Generate new branch ID
    const countResult = await query("SELECT COUNT(*) as cnt FROM branches");
    const newId = `BR-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO branches (id, name, manager, address, city, state, pin, phone, email, opening, closing, status, staff, is_hq, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name,
        manager || "Manager",
        address,
        city,
        state,
        pin,
        phone,
        email || "",
        opening || "08:30 AM",
        closing || "09:30 PM",
        status || "Active",
        staff || 1,
        isHQ ? 1 : 0,
        lat,
        lng,
      ]
    );

    const [created] = await query(
      `SELECT id, name, manager, address, city, state, pin, phone, email,
              opening, closing, status, staff, is_hq AS isHQ,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng
       FROM branches WHERE id = ?`,
      [newId]
    );
    created.isHQ = Boolean(created.isHQ);
    return success(res, created, "Branch created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, manager, address, city, state, pin, phone, email, opening, closing, status, staff, isHQ, lat, lng } = req.body;

    const existing = await query("SELECT id, name FROM branches WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Branch not found", 404);
    }
    const oldName = existing[0].name;

    await query(
      `UPDATE branches
       SET name = COALESCE(?, name),
           manager = COALESCE(?, manager),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           pin = COALESCE(?, pin),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           opening = COALESCE(?, opening),
           closing = COALESCE(?, closing),
           status = COALESCE(?, status),
           staff = COALESCE(?, staff),
           is_hq = COALESCE(?, is_hq),
           lat = COALESCE(?, lat),
           lng = COALESCE(?, lng)
       WHERE id = ?`,
      [
        name ?? null,
        manager ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        pin ?? null,
        phone ?? null,
        email ?? null,
        opening ?? null,
        closing ?? null,
        status ?? null,
        staff ?? null,
        isHQ !== undefined ? (isHQ ? 1 : 0) : null,
        lat ?? null,
        lng ?? null,
        id,
      ]
    );

    // Cascade name changes across reservations
    if (name && oldName && name !== oldName) {
      await query("UPDATE reservations SET branch_name = ? WHERE branch_id = ? OR branch_name = ?", [name, id, oldName]);
    }

    const [updated] = await query(
      `SELECT id, name, manager, address, city, state, pin, phone, email,
              opening, closing, status, staff, is_hq AS isHQ,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng
       FROM branches WHERE id = ?`,
      [id]
    );
    updated.isHQ = Boolean(updated.isHQ);
    return success(res, updated, "Branch updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM branches WHERE id = ?", [id]);
    return success(res, { id }, "Branch deleted successfully");
  } catch (err) {
    next(err);
  }
}
