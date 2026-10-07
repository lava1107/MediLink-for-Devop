import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const customers = await query(
      `SELECT id, name, phone, email, address, rx_ref AS rxRef,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM customers
       ORDER BY id ASC`
    );
    return success(res, customers);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const customers = await query(
      `SELECT id, name, phone, email, address, rx_ref AS rxRef,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM customers
       WHERE id = ?`,
      [id]
    );

    if (customers.length === 0) {
      return error(res, "Customer not found", 404);
    }

    const customer = customers[0];

    // Customer purchases
    const purchases = await query(
      `SELECT id, bill, DATE_FORMAT(sale_date, '%Y-%m-%d') AS date,
              CAST(amount AS DOUBLE) AS amount, payment, status
       FROM sales
       WHERE customer_id = ? OR customer_name = ?
       ORDER BY sale_date DESC`,
      [id, customer.name]
    );

    // Customer reservations
    const reservations = await query(
      `SELECT id, medicine_name AS medicine, branch_name AS branch, quantity,
              DATE_FORMAT(res_date, '%Y-%m-%d') AS resDate,
              DATE_FORMAT(expiry, '%Y-%m-%d') AS expiry, status
       FROM reservations
       WHERE customer_id = ? OR customer_name = ?
       ORDER BY res_date DESC`,
      [id, customer.name]
    );

    customer.purchases = purchases;
    customer.reservations = reservations;

    return success(res, customer);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, phone, email, address, rxRef } = req.body;
    if (!name || !phone) {
      return error(res, "Name and phone number are required.", 400);
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM customers");
    const newId = `CUS-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO customers (id, name, phone, email, address, rx_ref)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, name, phone, email || "", address || "", rxRef || "-"]
    );

    const [created] = await query(
      `SELECT id, name, phone, email, address, rx_ref AS rxRef,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM customers
       WHERE id = ?`,
      [newId]
    );
    return success(res, created, "Customer created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, email, address, rxRef } = req.body;

    const existing = await query("SELECT id, name FROM customers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Customer not found", 404);
    }
    const oldName = existing[0].name;

    await query(
      `UPDATE customers
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           rx_ref = COALESCE(?, rx_ref)
       WHERE id = ?`,
      [name ?? null, phone ?? null, email ?? null, address ?? null, rxRef ?? null, id]
    );

    // Cascade name changes across related tables
    if (name && oldName && name !== oldName) {
      await query("UPDATE sales SET customer_name = ? WHERE customer_id = ? OR customer_name = ?", [name, id, oldName]);
      await query("UPDATE reservations SET customer_name = ? WHERE customer_id = ? OR customer_name = ?", [name, id, oldName]);
      await query("UPDATE prescriptions SET customer_name = ? WHERE customer_id = ? OR customer_name = ?", [name, id, oldName]);
    }

    const [updated] = await query(
      `SELECT id, name, phone, email, address, rx_ref AS rxRef,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM customers
       WHERE id = ?`,
      [id]
    );
    return success(res, updated, "Customer updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM customers WHERE id = ?", [id]);
    return success(res, { id }, "Customer deleted successfully");
  } catch (err) {
    next(err);
  }
}
