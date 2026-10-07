import { query, getConnection } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const { branch, date } = req.query;
    let sql = `
      SELECT s.id, s.bill, s.customer_name AS customer, s.pharmacist_name AS pharmacist,
             b.name AS branch, b.id AS branchId,
             DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS date,
             CAST(s.subtotal AS DOUBLE) AS subtotal,
             CAST(s.discount AS DOUBLE) AS discount,
             CAST(s.gst AS DOUBLE) AS gst,
             CAST(s.amount AS DOUBLE) AS amount,
             s.payment, s.status
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
    `;

    const params = [];
    const conditions = [];

    if (branch) {
      conditions.push("(b.name = ? OR b.id = ?)");
      params.push(branch, branch);
    }
    if (date) {
      conditions.push("s.sale_date = ?");
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY s.sale_date DESC, s.id DESC";

    const sales = await query(sql, params);
    return success(res, sales);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const sales = await query(
      `SELECT s.id, s.bill, s.customer_name AS customer, s.pharmacist_name AS pharmacist,
              b.name AS branch, b.id AS branchId,
              DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS date,
              CAST(s.subtotal AS DOUBLE) AS subtotal,
              CAST(s.discount AS DOUBLE) AS discount,
              CAST(s.gst AS DOUBLE) AS gst,
              CAST(s.amount AS DOUBLE) AS amount,
              s.payment, s.status
       FROM sales s
       JOIN branches b ON s.branch_id = b.id
       WHERE s.id = ?`,
      [id]
    );

    if (sales.length === 0) {
      return error(res, "Sale not found", 404);
    }

    const sale = sales[0];

    const items = await query(
      `SELECT si.id, m.name AS name, m.generic AS generic,
              b.batch_no AS batchNo,
              DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
              si.quantity AS qty,
              CAST(si.unit_price AS DOUBLE) AS price,
              CAST(si.discount AS DOUBLE) AS discount,
              CAST(si.gst AS DOUBLE) AS gst,
              CAST(si.total AS DOUBLE) AS lineTotal
       FROM sale_items si
       JOIN medicines m ON si.medicine_id = m.id
       JOIN medicine_batches b ON si.batch_id = b.id
       WHERE si.sale_id = ?`,
      [id]
    );

    sale.items = items;

    return success(res, sale);
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a sale transaction:
 * 1. Validate stock for each batch (with FOR UPDATE lock)
 * 2. Validate batch expiry
 * 3. Validate prescription requirements for Rx medicines
 * 4. Create sale record
 * 5. Create sale items
 * 6. Reduce batch available stock
 * 7. If batch stock drops <= 20, create Low Stock notification
 * 8. Return created sale and updated batch state
 */
export async function create(req, res, next) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const cart = req.body.cart || req.body.items;
    const customerName = req.body.customerName || req.body.customer || "Walk-in Customer";
    const branch = req.body.branch || req.body.branchId || req.user?.branch || "Kovilpatti Branch";
    const pharmacistName = req.body.pharmacistName || req.body.pharmacist || req.user?.name || "Pharmacist";
    const payment = req.body.payment || "Cash";
    const grandTotal = req.body.grandTotal ?? req.body.amount ?? req.body.total;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      await connection.rollback();
      return error(res, "Cannot generate bill with an empty cart.", 400);
    }

    // Resolve branch_id
    const [branchRows] = await connection.query(
      "SELECT id, name, address, city, state, pin, phone, email FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?",
      [branch, branch]
    );
    if (branchRows.length === 0) {
      await connection.rollback();
      return error(res, `Branch '${branch}' not found.`, 404);
    }
    const branchObj = branchRows[0];
    const branchId = branchObj.id;
    const branchName = branchObj.name;

    const billingCustomer = customerName || "Walk-in Customer";

    // Resolve or find customer_id if exists
    let customerId = null;
    const [custRows] = await connection.query("SELECT id FROM customers WHERE LOWER(name) = LOWER(?)", [billingCustomer]);
    if (custRows.length > 0) customerId = custRows[0].id;

    // Validate each cart item against database batches
    for (const item of cart) {
      const [batchRows] = await connection.query(
        `SELECT b.id, b.available, b.status, b.expiry_date, m.id AS medicine_id, m.name AS med_name, m.rx
         FROM medicine_batches b
         JOIN medicines m ON b.medicine_id = m.id
         WHERE b.id = ? FOR UPDATE`,
        [item.batchId]
      );

      if (batchRows.length === 0) {
        await connection.rollback();
        return error(res, `Batch '${item.batchNo || item.batchId}' not found.`, 404);
      }

      const batch = batchRows[0];

      // Expiry check
      if (batch.status === "Expired" || new Date(batch.expiry_date) < new Date()) {
        await connection.rollback();
        return error(res, `Cannot sell expired medicine: ${batch.med_name} (Batch: ${item.batchNo}).`, 400);
      }

      const itemQty = Number(item.qty ?? item.quantity ?? 1);
      // Stock check
      if (batch.available < itemQty) {
        await connection.rollback();
        return error(
          res,
          `Insufficient stock for ${batch.med_name}. Requested: ${itemQty}, Available: ${batch.available}.`,
          400
        );
      }

      // Prescription check for Rx-required medicines
      if (batch.rx) {
        const [rxRows] = await connection.query(
          `SELECT id, status FROM prescriptions
           WHERE (customer_name = ? OR customer_id = ?) AND medicine = ?
           ORDER BY id DESC LIMIT 1`,
          [billingCustomer, customerId, batch.med_name]
        );

        if (rxRows.length === 0 || rxRows[0].status !== "Verified") {
          await connection.rollback();
          return error(
            res,
            `Medicine '${batch.med_name}' requires a verified prescription for customer '${billingCustomer}'.`,
            400
          );
        }
      }
    }

    // Calculate totals
    const subtotal = cart.reduce((a, i) => {
      const price = Number(i.price ?? i.sellingPrice ?? i.unitPrice ?? 0);
      const qty = Number(i.qty ?? i.quantity ?? 1);
      return a + price * qty;
    }, 0);
    const discount = cart.reduce((a, i) => {
      const price = Number(i.price ?? i.sellingPrice ?? i.unitPrice ?? 0);
      const qty = Number(i.qty ?? i.quantity ?? 1);
      const disc = Number(i.discount ?? 0);
      return a + (price * qty * disc) / 100;
    }, 0);
    const gst = cart.reduce((a, i) => {
      const price = Number(i.price ?? i.sellingPrice ?? i.unitPrice ?? 0);
      const qty = Number(i.qty ?? i.quantity ?? 1);
      const disc = Number(i.discount ?? 0);
      const g = Number(i.gst ?? 0);
      const base = price * qty - (price * qty * disc) / 100;
      return a + (base * g) / 100;
    }, 0);
    const totalAmount = grandTotal !== undefined && !isNaN(Number(grandTotal)) ? Math.round(Number(grandTotal)) : Math.round(subtotal - discount + gst);

    // Bill Number generation
    const [countRows] = await connection.query("SELECT COUNT(*) AS sCount FROM sales");
    const sCount = Number(countRows[0]?.sCount || 0);
    const saleId = `SAL-${String(sCount + 1).padStart(2, "0")}`;
    const bill = `MDL/26-27/${1000 + sCount + 1}`;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Insert into sales
    await connection.query(
      `INSERT INTO sales (id, bill, customer_id, customer_name, branch_id, pharmacist_name, sale_date, subtotal, discount, gst, amount, payment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId,
        bill,
        customerId,
        billingCustomer,
        branchId,
        pharmacistName || "Pharmacist",
        today,
        subtotal,
        discount,
        gst,
        totalAmount,
        payment || "Cash",
        "Completed",
      ]
    );

    const updatedBatches = [];

    // 2. Insert items and reduce batch stock
    for (const item of cart) {
      const itemPrice = Number(item.price ?? item.sellingPrice ?? item.unitPrice ?? 0);
      const itemQty = Number(item.qty ?? item.quantity ?? 1);
      const itemDiscount = Number(item.discount ?? 0);
      const itemGst = Number(item.gst ?? 12);
      const lineSub = itemPrice * itemQty;
      const lineTotal = lineSub - (lineSub * itemDiscount) / 100 + ((lineSub - (lineSub * itemDiscount) / 100) * itemGst) / 100;

      await connection.query(
        `INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, discount, gst, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.medicineId, item.batchId, itemQty, itemPrice, itemDiscount, itemGst, lineTotal]
      );

      // Decrement stock in database
      await connection.query(
        "UPDATE medicine_batches SET available = GREATEST(0, available - ?), quantity = GREATEST(0, quantity - ?) WHERE id = ?",
        [itemQty, itemQty, item.batchId]
      );

      const [bRows] = await connection.query(
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
        [item.batchId]
      );
      const updatedBatch = bRows[0];
      updatedBatches.push(updatedBatch);

      // Low stock alert if stock drops <= 20
      if (updatedBatch.available <= 20 && updatedBatch.available > 0) {
        const [[{ nCount }]] = await connection.query("SELECT COUNT(*) AS nCount FROM notifications");
        const notifId = `N${nCount + 1}`;
        await connection.query(
          `INSERT INTO notifications (id, type, title, \`desc\`, time, \`read\`, branch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            notifId,
            "Low Stock",
            `Low stock: ${updatedBatch.medicineName}`,
            `${branchName} has only ${updatedBatch.available} units remaining.`,
            new Date().toISOString().slice(0, 10) + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            0,
            branchId,
          ]
        );
      }
    }

    await connection.commit();

    const createdSale = {
      id: saleId,
      bill,
      customer: billingCustomer,
      pharmacist: pharmacistName || "Pharmacist",
      branch: branchName,
      branchObj,
      amount: totalAmount,
      subtotal,
      discount,
      gst,
      payment: payment || "Cash",
      date: today,
      status: "Completed",
    };

    return success(res, {
      sale: createdSale,
      batches: updatedBatches,
    }, `Bill ${bill} generated successfully`, 201);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}
