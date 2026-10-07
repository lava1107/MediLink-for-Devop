import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const suppliers = await query(
      `SELECT id, name, company, contact, phone, email, address, city, state,
              gst, license, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM suppliers
       ORDER BY id ASC`
    );
    return success(res, suppliers);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const suppliers = await query(
      `SELECT id, name, company, contact, phone, email, address, city, state,
              gst, license, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM suppliers
       WHERE id = ?`,
      [id]
    );

    if (suppliers.length === 0) {
      return error(res, "Supplier not found", 404);
    }

    const supplier = suppliers[0];

    // Fetch purchases for this supplier
    const purchases = await query(
      `SELECT p.id, p.invoice, p.branch_id AS branchId, br.name AS branch,
              DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
              CAST(p.amount AS DOUBLE) AS amount,
              p.payment, p.status
       FROM purchases p
       JOIN branches br ON p.branch_id = br.id
       WHERE p.supplier_id = ?
       ORDER BY p.purchase_date DESC`,
      [id]
    );

    supplier.purchases = purchases;

    return success(res, supplier);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, company, contact, phone, email, address, city, state, gst, license, status } = req.body;
    if (!name || !company || !contact || !phone || !gst) {
      return error(res, "Name, company, contact, phone, and GST number are required.", 400);
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM suppliers");
    const newId = `SUP-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO suppliers (id, name, company, contact, phone, email, address, city, state, gst, license, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name,
        company,
        contact,
        phone,
        email || "",
        address || "",
        city || "",
        state || "",
        gst,
        license || "",
        status || "Active",
      ]
    );

    const [created] = await query("SELECT * FROM suppliers WHERE id = ?", [newId]);
    return success(res, created, "Supplier created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, company, contact, phone, email, address, city, state, gst, license, status } = req.body;

    const existing = await query("SELECT id, name FROM suppliers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Supplier not found", 404);
    }
    const oldName = existing[0].name;

    await query(
      `UPDATE suppliers
       SET name = COALESCE(?, name),
           company = COALESCE(?, company),
           contact = COALESCE(?, contact),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           gst = COALESCE(?, gst),
           license = COALESCE(?, license),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name ?? null,
        company ?? null,
        contact ?? null,
        phone ?? null,
        email ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        gst ?? null,
        license ?? null,
        status ?? null,
        id,
      ]
    );

    const [updated] = await query("SELECT * FROM suppliers WHERE id = ?", [id]);
    return success(res, updated, "Supplier updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM suppliers WHERE id = ?", [id]);
    return success(res, { id }, "Supplier deleted successfully");
  } catch (err) {
    next(err);
  }
}
