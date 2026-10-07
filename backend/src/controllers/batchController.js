import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

function calculateExpiryStatus(expiryDate) {
  const days = Math.round((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring Soon";
  return "Safe";
}

export async function getAll(req, res, next) {
  try {
    const { branch, status } = req.query;
    let sql = `
      SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
             b.branch_id AS branchId, br.name AS branchName,
             b.supplier_id AS supplierId, s.name AS supplierName,
             DATE_FORMAT(b.mfg_date, '%Y-%m-%d') AS mfgDate,
             DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
             b.quantity, b.available,
             CAST(b.purchase_price AS DOUBLE) AS purchasePrice,
             CAST(b.selling_price AS DOUBLE) AS sellingPrice,
             b.rack, b.status
      FROM medicine_batches b
      JOIN medicines m ON b.medicine_id = m.id
      JOIN branches br ON b.branch_id = br.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
    `;

    const params = [];
    const conditions = [];

    if (branch) {
      conditions.push("(br.name = ? OR br.id = ?)");
      params.push(branch, branch);
    }
    if (status) {
      conditions.push("b.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY b.expiry_date ASC";

    const batches = await query(sql, params);
    return success(res, batches);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const batches = await query(
      `SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
              b.branch_id AS branchId, br.name AS branchName,
              b.supplier_id AS supplierId, s.name AS supplierName,
              DATE_FORMAT(b.mfg_date, '%Y-%m-%d') AS mfgDate,
              DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
              b.quantity, b.available,
              CAST(b.purchase_price AS DOUBLE) AS purchasePrice,
              CAST(b.selling_price AS DOUBLE) AS sellingPrice,
              b.rack, b.status
       FROM medicine_batches b
       JOIN medicines m ON b.medicine_id = m.id
       JOIN branches br ON b.branch_id = br.id
       LEFT JOIN suppliers s ON b.supplier_id = s.id
       WHERE b.id = ?`,
      [id]
    );

    if (batches.length === 0) {
      return error(res, "Batch not found", 404);
    }

    return success(res, batches[0]);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { batchNo, medicineId, branchId, supplierId, mfgDate, expiryDate, quantity, available, purchasePrice, sellingPrice, rack } = req.body;
    if (!batchNo || !medicineId || !branchId || !mfgDate || !expiryDate || quantity === undefined) {
      return error(res, "Batch number, medicine, branch, dates, and quantity are required.", 400);
    }

    let resolvedBranchId = branchId;
    if (branchId) {
      const bRows = await query("SELECT id FROM branches WHERE id = ? OR LOWER(name) = LOWER(?)", [branchId, branchId]);
      if (bRows.length > 0) resolvedBranchId = bRows[0].id;
    }
    let resolvedMedicineId = medicineId;
    if (medicineId) {
      const mRows = await query("SELECT id FROM medicines WHERE id = ? OR LOWER(name) = LOWER(?)", [medicineId, medicineId]);
      if (mRows.length > 0) resolvedMedicineId = mRows[0].id;
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM medicine_batches");
    const newId = `BAT-${String(countResult[0].cnt + 1).padStart(2, "0")}`;
    const status = calculateExpiryStatus(expiryDate);
    const avail = available !== undefined ? Number(available) : Number(quantity);

    await query(
      `INSERT INTO medicine_batches (id, batch_no, medicine_id, branch_id, supplier_id, mfg_date, expiry_date, quantity, available, purchase_price, selling_price, rack, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        batchNo,
        resolvedMedicineId,
        resolvedBranchId,
        supplierId || null,
        mfgDate,
        expiryDate,
        Number(quantity),
        avail,
        Number(purchasePrice) || 0,
        Number(sellingPrice) || 0,
        rack || "A1-01",
        status,
      ]
    );

    const [created] = await query(
      `SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
              b.branch_id AS branchId, br.name AS branchName,
              DATE_FORMAT(b.mfg_date, '%Y-%m-%d') AS mfgDate,
              DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
              b.quantity, b.available,
              CAST(b.purchase_price AS DOUBLE) AS purchasePrice,
              CAST(b.selling_price AS DOUBLE) AS sellingPrice,
              b.rack, b.status
       FROM medicine_batches b
       JOIN medicines m ON b.medicine_id = m.id
       JOIN branches br ON b.branch_id = br.id
       WHERE b.id = ?`,
      [newId]
    );
    return success(res, created, "Batch created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { batchNo, mfgDate, expiryDate, quantity, available, purchasePrice, sellingPrice, rack, status } = req.body;

    const existing = await query("SELECT * FROM medicine_batches WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Batch not found", 404);
    }

    const expStatus = expiryDate ? calculateExpiryStatus(expiryDate) : status;

    await query(
      `UPDATE medicine_batches
       SET batch_no = COALESCE(?, batch_no),
           mfg_date = COALESCE(?, mfg_date),
           expiry_date = COALESCE(?, expiry_date),
           quantity = COALESCE(?, quantity),
           available = COALESCE(?, available),
           purchase_price = COALESCE(?, purchase_price),
           selling_price = COALESCE(?, selling_price),
           rack = COALESCE(?, rack),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        batchNo ?? null,
        mfgDate ?? null,
        expiryDate ?? null,
        quantity !== undefined ? Number(quantity) : null,
        available !== undefined ? Number(available) : null,
        purchasePrice !== undefined ? Number(purchasePrice) : null,
        sellingPrice !== undefined ? Number(sellingPrice) : null,
        rack ?? null,
        expStatus ?? null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
              b.branch_id AS branchId, br.name AS branchName,
              DATE_FORMAT(b.mfg_date, '%Y-%m-%d') AS mfgDate,
              DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
              b.quantity, b.available,
              CAST(b.purchase_price AS DOUBLE) AS purchasePrice,
              CAST(b.selling_price AS DOUBLE) AS sellingPrice,
              b.rack, b.status
       FROM medicine_batches b
       JOIN medicines m ON b.medicine_id = m.id
       JOIN branches br ON b.branch_id = br.id
       WHERE b.id = ?`,
      [id]
    );
    return success(res, updated, "Batch updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM medicine_batches WHERE id = ?", [id]);
    return success(res, { id }, "Batch deleted successfully");
  } catch (err) {
    next(err);
  }
}
