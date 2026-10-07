import { query, getConnection } from "../config/db.js";
import { success, error } from "../utils/response.js";

const RACKS = ["A1-01", "A1-02", "A2-05", "B1-03", "B2-01", "C1-04", "C2-02", "D1-01"];

export async function getAll(req, res, next) {
  try {
    const { branch, supplier } = req.query;
    let sql = `
      SELECT p.id, p.invoice, p.purchased_by AS purchasedBy,
             DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
             CAST(p.amount AS DOUBLE) AS amount,
             p.payment, p.status,
             s.name AS supplier, s.id AS supplierId,
             b.name AS branch, b.id AS branchId
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN branches b ON p.branch_id = b.id
    `;

    const params = [];
    const conditions = [];

    if (branch) {
      conditions.push("(b.name = ? OR b.id = ?)");
      params.push(branch, branch);
    }
    if (supplier) {
      conditions.push("(s.name = ? OR s.id = ?)");
      params.push(supplier, supplier);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY p.purchase_date DESC, p.id DESC";

    const purchases = await query(sql, params);
    return success(res, purchases);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const purchases = await query(
      `SELECT p.id, p.invoice, p.purchased_by AS purchasedBy,
              DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
              CAST(p.amount AS DOUBLE) AS amount,
              p.payment, p.status,
              s.name AS supplier, s.id AS supplierId,
              b.name AS branch, b.id AS branchId
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       JOIN branches b ON p.branch_id = b.id
       WHERE p.id = ?`,
      [id]
    );

    if (purchases.length === 0) {
      return error(res, "Purchase not found", 404);
    }

    const purchase = purchases[0];

    const items = await query(
      `SELECT pi.id, pi.batch_no AS batchNo,
              DATE_FORMAT(pi.mfg_date, '%Y-%m-%d') AS mfgDate,
              DATE_FORMAT(pi.expiry_date, '%Y-%m-%d') AS expiryDate,
              pi.quantity,
              CAST(pi.purchase_price AS DOUBLE) AS purchasePrice,
              CAST(pi.discount AS DOUBLE) AS discount,
              CAST(pi.gst AS DOUBLE) AS gst,
              CAST(pi.total AS DOUBLE) AS total,
              m.name AS medicineName, m.generic AS genericName
       FROM purchase_items pi
       JOIN medicines m ON pi.medicine_id = m.id
       WHERE pi.purchase_id = ?`,
      [id]
    );

    purchase.items = items;

    return success(res, purchase);
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a purchase transaction:
 * - Inserts purchase
 * - Inserts purchase_items
 * - Creates/updates medicine batches with increased available quantity
 * - Inserts system notification
 */
export async function create(req, res, next) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const supplier = req.body.supplier || req.body.supplierId;
    const branch = req.body.branch || req.body.branchId || "Kovilpatti Branch";
    const items = req.body.items || req.body.cart;
    const grandTotal = req.body.grandTotal ?? req.body.amount;
    const paymentStatus = req.body.paymentStatus || req.body.payment || "Completed";
    const purchasedBy = req.body.purchasedBy || req.user?.name || "Admin";

    if (!supplier || !branch || !items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return error(res, "Supplier, branch, and at least one purchase item are required.", 400);
    }

    // Resolve supplier_id
    const [supplierRows] = await connection.query(
      "SELECT id, name FROM suppliers WHERE LOWER(name) = LOWER(?) OR id = ?",
      [supplier, supplier]
    );
    if (supplierRows.length === 0) {
      await connection.rollback();
      return error(res, `Supplier '${supplier}' not found.`, 404);
    }
    const supplierId = supplierRows[0].id;
    const supplierName = supplierRows[0].name;

    // Resolve branch_id
    const [branchRows] = await connection.query(
      "SELECT id, name FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?",
      [branch, branch]
    );
    if (branchRows.length === 0) {
      await connection.rollback();
      return error(res, `Branch '${branch}' not found.`, 404);
    }
    const branchId = branchRows[0].id;
    const branchName = branchRows[0].name;

    // Count existing purchases for ID & invoice formatting
    const [countRows] = await connection.query("SELECT COUNT(*) AS pCount FROM purchases");
    const pCount = Number(countRows[0]?.pCount || 0);
    const purchaseId = `PUR-${String(pCount + 1).padStart(2, "0")}`;
    const invoicePrefix = supplierName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
    const invoice = `${invoicePrefix}/INV/${1000 + pCount + 1}`;
    const today = new Date().toISOString().slice(0, 10);

    const totalAmount = Math.round(Number(grandTotal) || 0);

    let validPayment = "Paid";
    if (["Paid", "Pending", "Partially Paid"].includes(paymentStatus)) {
      validPayment = paymentStatus;
    }

    let validStatus = "Received";
    if (["Received", "Ordered"].includes(req.body.status)) {
      validStatus = req.body.status;
    }

    // 1. Insert Purchase
    await connection.query(
      `INSERT INTO purchases (id, invoice, supplier_id, branch_id, purchased_by, purchase_date, amount, payment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        invoice,
        supplierId,
        branchId,
        purchasedBy || "Admin",
        today,
        totalAmount,
        validPayment,
        validStatus,
      ]
    );

    const createdBatches = [];

    // 2. Process Items & Batches
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const medRef = it.medicine || it.medicineId || it.name;

      // Find medicine
      const [medRows] = await connection.query(
        "SELECT id, name, generic, selling_price, gst FROM medicines WHERE LOWER(name) = LOWER(?) OR id = ?",
        [medRef, medRef]
      );
      if (medRows.length === 0) {
        await connection.rollback();
        return error(res, `Medicine '${medRef}' not found in catalogue.`, 404);
      }
      const med = medRows[0];

      const qty = Number(it.qty ?? it.quantity ?? 1);
      const price = Number(it.price ?? it.purchasePrice ?? it.unitCost ?? 0);
      const discount = Number(it.discount ?? 0);
      const gst = Number(it.gst ?? 12);
      const lineSubtotal = qty * price;
      const lineTotal = Math.round(lineSubtotal - (lineSubtotal * discount) / 100 + ((lineSubtotal - (lineSubtotal * discount) / 100) * gst) / 100);

      const mfgDate = it.mfgDate || today;
      // Default expiry date 1 year from today if not specified
      const expiryDate = it.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
      const batchNo = it.batchNo;

      // Insert purchase item
      await connection.query(
        `INSERT INTO purchase_items (purchase_id, medicine_id, batch_no, mfg_date, expiry_date, quantity, purchase_price, discount, gst, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, med.id, batchNo, mfgDate, expiryDate, qty, price, discount, gst, lineTotal]
      );

      // Check if this batch number already exists at this branch
      const [existingBatchRows] = await connection.query(
        "SELECT id, available, quantity FROM medicine_batches WHERE batch_no = ? AND branch_id = ?",
        [batchNo, branchId]
      );

      let batchRecord;
      if (existingBatchRows.length > 0) {
        // Update existing batch: increase quantity and available stock
        const existingBatch = existingBatchRows[0];
        const updatedQty = existingBatch.quantity + qty;
        const updatedAvailable = existingBatch.available + qty;

        await connection.query(
          `UPDATE medicine_batches
           SET quantity = ?, available = ?, supplier_id = COALESCE(supplier_id, ?), purchase_price = ?
           WHERE id = ?`,
          [updatedQty, updatedAvailable, supplierId, price, existingBatch.id]
        );

        const [bUpdated] = await connection.query("SELECT * FROM medicine_batches WHERE id = ?", [existingBatch.id]);
        batchRecord = bUpdated[0];
      } else {
        // Create new batch record
        const [[{ bCount }]] = await connection.query("SELECT COUNT(*) AS bCount FROM medicine_batches");
        const batchId = `BAT-${String(bCount + 1).padStart(2, "0")}`;
        const sellingPrice = Math.round(price * 1.5);
        const rack = RACKS[i % RACKS.length];

        const days = Math.round((new Date(expiryDate) - new Date()) / 86400000);
        const status = days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Safe";

        await connection.query(
          `INSERT INTO medicine_batches (id, batch_no, medicine_id, branch_id, supplier_id, mfg_date, expiry_date, quantity, available, purchase_price, selling_price, rack, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            batchNo,
            med.id,
            branchId,
            supplierId,
            mfgDate,
            expiryDate,
            qty,
            qty,
            price,
            sellingPrice,
            rack,
            status,
          ]
        );

        const [bNew] = await connection.query("SELECT * FROM medicine_batches WHERE id = ?", [batchId]);
        batchRecord = bNew[0];
      }

      batchRecord.medicineName = med.name;
      batchRecord.branchName = branchName;
      createdBatches.push(batchRecord);
    }

    // 3. Create Notification
    const [[{ nCount }]] = await connection.query("SELECT COUNT(*) AS nCount FROM notifications");
    const notifId = `N${nCount + 1}`;
    await connection.query(
      `INSERT INTO notifications (id, type, title, \`desc\`, time, \`read\`, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        notifId,
        "New Purchase",
        `Purchase received: ${invoice}`,
        `${supplierName} delivery confirmed at ${branchName}.`,
        new Date().toISOString().slice(0, 10) + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        0,
        branchId,
      ]
    );

    await connection.commit();

    const newPurchase = {
      id: purchaseId,
      invoice,
      supplier: supplierName,
      branch: branchName,
      purchasedBy: purchasedBy || "Admin",
      date: today,
      amount: totalAmount,
      payment: paymentStatus || "Pending",
      status: "Received",
    };

    return success(res, {
      purchase: newPurchase,
      batches: createdBatches,
    }, "Purchase completed and stock updated successfully", 201);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { invoice, payment, status, supplier, branch, amount, purchasedBy } = req.body;

    const existing = await query("SELECT id FROM purchases WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Purchase not found", 404);
    }

    let supplierId = null;
    if (supplier) {
      const sRows = await query("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?) OR id = ?", [supplier, supplier]);
      if (sRows.length > 0) supplierId = sRows[0].id;
    }

    let branchId = null;
    if (branch) {
      const bRows = await query("SELECT id FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?", [branch, branch]);
      if (bRows.length > 0) branchId = bRows[0].id;
    }

    await query(
      `UPDATE purchases
       SET invoice = COALESCE(?, invoice),
           supplier_id = COALESCE(?, supplier_id),
           branch_id = COALESCE(?, branch_id),
           purchased_by = COALESCE(?, purchased_by),
           amount = COALESCE(?, amount),
           payment = COALESCE(?, payment),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        invoice ?? null,
        supplierId,
        branchId,
        purchasedBy ?? null,
        amount !== undefined ? Number(amount) : null,
        payment ?? null,
        status ?? null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT p.id, p.invoice, s.name AS supplier, b.name AS branch,
              p.purchased_by AS purchasedBy,
              DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
              CAST(p.amount AS DOUBLE) AS amount,
              p.payment, p.status
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       JOIN branches b ON p.branch_id = b.id
       WHERE p.id = ?`,
      [id]
    );

    return success(res, updated, "Purchase updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM purchases WHERE id = ?", [id]);
    return success(res, { id }, "Purchase deleted successfully");
  } catch (err) {
    next(err);
  }
}

