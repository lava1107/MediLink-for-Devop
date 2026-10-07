import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const { search, category } = req.query;
    let sql = `
      SELECT m.id, m.name, m.generic, m.brand, m.manufacturer, m.dosage, m.strength,
             m.type, m.rx,
             CAST(m.purchase_price AS DOUBLE) AS purchase,
             CAST(m.selling_price AS DOUBLE) AS selling,
             CAST(m.gst AS DOUBLE) AS gst,
             m.status,
             c.name AS category,
             c.id AS category_id,
             COALESCE(SUM(CASE WHEN b.status != 'Expired' AND b.available > 0 THEN b.available ELSE 0 END), 0) AS stock
      FROM medicines m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN medicine_batches b ON b.medicine_id = m.id
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push("(m.name LIKE ? OR m.generic LIKE ? OR m.brand LIKE ? OR m.manufacturer LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (category) {
      conditions.push("c.name = ?");
      params.push(category);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " GROUP BY m.id ORDER BY m.id ASC";

    const medicines = await query(sql, params);
    // Convert rx to boolean
    const formatted = medicines.map((m) => ({
      ...m,
      rx: Boolean(m.rx),
      stock: Number(m.stock),
    }));

    return success(res, formatted);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const medicines = await query(
      `SELECT m.id, m.name, m.generic, m.brand, m.manufacturer, m.dosage, m.strength,
              m.type, m.rx,
              CAST(m.purchase_price AS DOUBLE) AS purchase,
              CAST(m.selling_price AS DOUBLE) AS selling,
              CAST(m.gst AS DOUBLE) AS gst,
              m.status,
              c.name AS category,
              c.id AS category_id
       FROM medicines m
       JOIN categories c ON m.category_id = c.id
       WHERE m.id = ?`,
      [id]
    );

    if (medicines.length === 0) {
      return error(res, "Medicine not found", 404);
    }

    const med = medicines[0];
    med.rx = Boolean(med.rx);

    // Fetch batches for this medicine
    const batches = await query(
      `SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId,
              b.branch_id AS branchId, br.name AS branchName,
              b.mfg_date AS mfgDate, b.expiry_date AS expiryDate,
              b.quantity, b.available,
              CAST(b.purchase_price AS DOUBLE) AS purchasePrice,
              CAST(b.selling_price AS DOUBLE) AS sellingPrice,
              b.rack, b.status
       FROM medicine_batches b
       JOIN branches br ON b.branch_id = br.id
       WHERE b.medicine_id = ?
       ORDER BY b.expiry_date ASC`,
      [id]
    );

    med.batches = batches;
    med.stock = batches
      .filter((b) => b.status !== "Expired")
      .reduce((total, b) => total + b.available, 0);

    return success(res, med);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, generic, brand, category, manufacturer, dosage, strength, type, rx, purchase, selling, gst, status } = req.body;
    if (!name || !generic || !manufacturer) {
      return error(res, "Name, generic name and manufacturer are required.", 400);
    }

    // Resolve category_id
    let categoryId = "CAT-01";
    if (category) {
      const catRows = await query("SELECT id FROM categories WHERE LOWER(name) = LOWER(?) OR id = ?", [category, category]);
      if (catRows.length > 0) categoryId = catRows[0].id;
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM medicines");
    const newId = `MED-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO medicines (id, name, generic, brand, category_id, manufacturer, dosage, strength, type, rx, purchase_price, selling_price, gst, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name,
        generic,
        brand || "Generic",
        categoryId,
        manufacturer,
        dosage || "Tablet",
        strength || "",
        type || "OTC",
        rx === true || rx === "true" || rx === 1 ? 1 : 0,
        Number(purchase) || 0,
        Number(selling) || 0,
        Number(gst) || 12,
        status || "Active",
      ]
    );

    const initialQty = Number(req.body.initialStock || req.body.stock || req.body.quantity || 0);
    const branchName = req.body.branch || req.body.branchName || "Kovilpatti Branch";
    let branchId = req.body.branchId || "BR-01";
    if (branchName) {
      const bRows = await query("SELECT id FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?", [branchName, branchName]);
      if (bRows.length > 0) branchId = bRows[0].id;
    }

    if (initialQty > 0) {
      const batchNo = req.body.batchNo || `BAT-INIT-${Math.floor(1000 + Math.random() * 9000)}`;
      const batchId = `BAT-${Date.now().toString().slice(-6)}`;
      const today = new Date().toISOString().split("T")[0];
      const expiry = req.body.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

      await query(
        `INSERT INTO medicine_batches (id, batch_no, medicine_id, branch_id, mfg_date, expiry_date, quantity, available, purchase_price, selling_price, rack, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Safe')`,
        [
          batchId,
          batchNo,
          newId,
          branchId,
          today,
          expiry,
          initialQty,
          initialQty,
          Number(purchase) || 0,
          Number(selling) || 0,
          req.body.rack || "A1-01",
        ]
      );
    }

    const [created] = await query(
      `SELECT m.id, m.name, m.generic, m.brand, m.manufacturer, m.dosage, m.strength,
              m.type, m.rx,
              CAST(m.purchase_price AS DOUBLE) AS purchase,
              CAST(m.selling_price AS DOUBLE) AS selling,
              CAST(m.gst AS DOUBLE) AS gst,
              m.status, c.name AS category,
              COALESCE(SUM(CASE WHEN b.status != 'Expired' AND b.available > 0 THEN b.available ELSE 0 END), 0) AS stock
       FROM medicines m
       JOIN categories c ON m.category_id = c.id
       LEFT JOIN medicine_batches b ON b.medicine_id = m.id
       WHERE m.id = ?
       GROUP BY m.id`,
      [newId]
    );

    created.rx = Boolean(created.rx);
    created.stock = Number(created.stock) || initialQty;

    return success(res, created, "Medicine created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, generic, brand, category, manufacturer, dosage, strength, type, rx, purchase, selling, gst, status } = req.body;

    const existing = await query("SELECT id, name FROM medicines WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Medicine not found", 404);
    }
    const oldName = existing[0].name;

    let categoryId = null;
    if (category) {
      const catRows = await query("SELECT id FROM categories WHERE LOWER(name) = LOWER(?) OR id = ?", [category, category]);
      if (catRows.length > 0) categoryId = catRows[0].id;
    }

    const rxValue = rx !== undefined ? (rx === true || rx === "true" || rx === 1 ? 1 : 0) : null;

    await query(
      `UPDATE medicines
       SET name = COALESCE(?, name),
           generic = COALESCE(?, generic),
           brand = COALESCE(?, brand),
           category_id = COALESCE(?, category_id),
           manufacturer = COALESCE(?, manufacturer),
           dosage = COALESCE(?, dosage),
           strength = COALESCE(?, strength),
           type = COALESCE(?, type),
           rx = COALESCE(?, rx),
           purchase_price = COALESCE(?, purchase_price),
           selling_price = COALESCE(?, selling_price),
           gst = COALESCE(?, gst),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name ?? null,
        generic ?? null,
        brand ?? null,
        categoryId ?? null,
        manufacturer ?? null,
        dosage ?? null,
        strength ?? null,
        type ?? null,
        rxValue,
        purchase !== undefined ? Number(purchase) : null,
        selling !== undefined ? Number(selling) : null,
        gst !== undefined ? Number(gst) : null,
        status ?? null,
        id,
      ]
    );

    // Cascade name changes across reservations and prescriptions
    if (name && oldName && name !== oldName) {
      await query("UPDATE reservations SET medicine_name = ? WHERE medicine_id = ? OR medicine_name = ?", [name, id, oldName]);
      await query("UPDATE prescriptions SET medicine = ? WHERE medicine_id = ? OR medicine = ?", [name, id, oldName]);
    }

    const [updated] = await query(
      `SELECT m.id, m.name, m.generic, m.brand, m.manufacturer, m.dosage, m.strength,
              m.type, m.rx,
              CAST(m.purchase_price AS DOUBLE) AS purchase,
              CAST(m.selling_price AS DOUBLE) AS selling,
              CAST(m.gst AS DOUBLE) AS gst,
              m.status, c.name AS category
       FROM medicines m
       JOIN categories c ON m.category_id = c.id
       WHERE m.id = ?`,
      [id]
    );

    updated.rx = Boolean(updated.rx);

    return success(res, updated, "Medicine updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM medicines WHERE id = ?", [id]);
    return success(res, { id }, "Medicine deleted successfully");
  } catch (err) {
    next(err);
  }
}
