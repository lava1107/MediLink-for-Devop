import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
             p.medicine_id AS medicineId, p.medicine, p.quantity,
             p.doctor_name AS doctorName,
             DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
             p.prescription_ref AS prescriptionRef,
             p.status, p.verified_by AS verifiedBy,
             p.verified_date AS verifiedDate,
             p.remarks,
             DATE_FORMAT(p.created_at, '%Y-%m-%d') AS created
      FROM prescriptions p
    `;

    const params = [];
    if (status) {
      sql += " WHERE p.status = ?";
      params.push(status);
    }

    sql += " ORDER BY p.id DESC";

    const prescriptions = await query(sql, params);
    return success(res, prescriptions);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const prescriptions = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks,
              DATE_FORMAT(p.created_at, '%Y-%m-%d') AS created
       FROM prescriptions p
       WHERE p.id = ?`,
      [id]
    );

    if (prescriptions.length === 0) {
      return error(res, "Prescription not found", 404);
    }

    return success(res, prescriptions[0]);
  } catch (err) {
    next(err);
  }
}

export async function find(req, res, next) {
  try {
    const { customerName, medicineName } = req.query;
    if (!customerName || !medicineName) {
      return error(res, "customerName and medicineName query parameters are required.", 400);
    }

    const prescriptions = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks
       FROM prescriptions p
       WHERE LOWER(p.customer_name) = LOWER(?) AND LOWER(p.medicine) = LOWER(?)
       ORDER BY p.id DESC LIMIT 1`,
      [customerName, medicineName]
    );

    return success(res, prescriptions.length > 0 ? prescriptions[0] : null);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { customerId, customerName, medicine, quantity, doctorName, prescriptionDate, prescriptionRef } = req.body;
    if (!customerName || !medicine || !doctorName || !prescriptionDate || !prescriptionRef) {
      return error(res, "Customer name, medicine, doctor name, date and reference are required.", 400);
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM prescriptions");
    const newId = `RX-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    // Resolve medicine_id
    let medId = null;
    const medRows = await query("SELECT id FROM medicines WHERE LOWER(name) = LOWER(?)", [medicine]);
    if (medRows.length > 0) medId = medRows[0].id;

    await query(
      `INSERT INTO prescriptions (id, customer_id, customer_name, medicine_id, medicine, quantity, doctor_name, prescription_date, prescription_ref, status, verified_by, verified_date, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        customerId || null,
        customerName,
        medId,
        medicine,
        Number(quantity) || 1,
        doctorName,
        prescriptionDate,
        prescriptionRef,
        "Pending",
        "",
        "",
        "",
      ]
    );

    const [created] = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks
       FROM prescriptions p
       WHERE p.id = ?`,
      [newId]
    );

    return success(res, created, "Prescription recorded successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const { id } = req.params;
    const { verifiedBy, remarks } = req.body;

    const existing = await query("SELECT id FROM prescriptions WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Prescription not found", 404);
    }

    const today = new Date().toISOString().slice(0, 10);
    const verifier = verifiedBy || (req.user ? req.user.name : "Pharmacist");

    await query(
      `UPDATE prescriptions
       SET status = 'Verified',
           verified_by = ?,
           verified_date = ?,
           remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [verifier, today, remarks || "Valid prescription verified.", id]
    );

    const [updated] = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks
       FROM prescriptions p
       WHERE p.id = ?`,
      [id]
    );

    return success(res, updated, "Prescription verified successfully");
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.params;
    const { verifiedBy, remarks } = req.body;

    const existing = await query("SELECT id FROM prescriptions WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Prescription not found", 404);
    }

    const today = new Date().toISOString().slice(0, 10);
    const verifier = verifiedBy || (req.user ? req.user.name : "Pharmacist");

    await query(
      `UPDATE prescriptions
       SET status = 'Rejected',
           verified_by = ?,
           verified_date = ?,
           remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [verifier, today, remarks || "Prescription verification rejected.", id]
    );

    const [updated] = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks
       FROM prescriptions p
       WHERE p.id = ?`,
      [id]
    );

    return success(res, updated, "Prescription rejected");
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { customerName, medicine, quantity, doctorName, prescriptionDate, status, remarks } = req.body;

    const existing = await query("SELECT id FROM prescriptions WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Prescription not found", 404);
    }

    await query(
      `UPDATE prescriptions
       SET customer_name = COALESCE(?, customer_name),
           medicine = COALESCE(?, medicine),
           quantity = COALESCE(?, quantity),
           doctor_name = COALESCE(?, doctor_name),
           prescription_date = COALESCE(?, prescription_date),
           status = COALESCE(?, status),
           remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        customerName ?? null,
        medicine ?? null,
        quantity !== undefined ? Number(quantity) : null,
        doctorName ?? null,
        prescriptionDate ?? null,
        status ?? null,
        remarks ?? null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
              p.medicine_id AS medicineId, p.medicine, p.quantity,
              p.doctor_name AS doctorName,
              DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
              p.prescription_ref AS prescriptionRef,
              p.status, p.verified_by AS verifiedBy,
              p.verified_date AS verifiedDate,
              p.remarks
       FROM prescriptions p
       WHERE p.id = ?`,
      [id]
    );

    return success(res, updated, "Prescription updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM prescriptions WHERE id = ?", [id]);
    return success(res, { id }, "Prescription deleted successfully");
  } catch (err) {
    next(err);
  }
}

