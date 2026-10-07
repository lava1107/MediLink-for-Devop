import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getAll(req, res, next) {
  try {
    const shops = await query(
      `SELECT id, name, owner, phone, email, address, city, state, pin, license, status,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM partner_medical_shops
       ORDER BY id ASC`
    );
    return success(res, shops);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const shops = await query(
      `SELECT id, name, owner, phone, email, address, city, state, pin, license, status,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM partner_medical_shops
       WHERE id = ?`,
      [id]
    );

    if (shops.length === 0) {
      return error(res, "Partner shop not found", 404);
    }

    const shop = shops[0];

    const medicines = await query(
      `SELECT psm.id, psm.medicine_name AS medicineName, psm.quantity,
              psm.last_updated AS lastUpdated
       FROM partner_shop_medicines psm
       WHERE psm.partner_shop_id = ?`,
      [id]
    );

    shop.medicines = medicines;

    return success(res, shop);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, owner, phone, email, address, city, state, pin, license, status, lat, lng } = req.body;
    if (!name || !owner || !phone || !address || !city || lat === undefined || lng === undefined) {
      return error(res, "Name, owner, phone, address, city, lat, and lng are required.", 400);
    }

    const countResult = await query("SELECT COUNT(*) as cnt FROM partner_medical_shops");
    const newId = `PS-${String(countResult[0].cnt + 1).padStart(2, "0")}`;

    await query(
      `INSERT INTO partner_medical_shops (id, name, owner, phone, email, address, city, state, pin, license, status, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name,
        owner,
        phone,
        email || "",
        address,
        city,
        state || "Tamil Nadu",
        pin || "",
        license || "",
        status || "Active",
        lat,
        lng,
      ]
    );

    const [created] = await query(
      `SELECT id, name, owner, phone, email, address, city, state, pin, license, status,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM partner_medical_shops WHERE id = ?`,
      [newId]
    );
    return success(res, created, "Partner shop created successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, owner, phone, email, address, city, state, pin, license, status, lat, lng } = req.body;

    const existing = await query("SELECT id FROM partner_medical_shops WHERE id = ?", [id]);
    if (existing.length === 0) {
      return error(res, "Partner shop not found", 404);
    }

    await query(
      `UPDATE partner_medical_shops
       SET name = COALESCE(?, name),
           owner = COALESCE(?, owner),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           pin = COALESCE(?, pin),
           license = COALESCE(?, license),
           status = COALESCE(?, status),
           lat = COALESCE(?, lat),
           lng = COALESCE(?, lng)
       WHERE id = ?`,
      [
        name ?? null,
        owner ?? null,
        phone ?? null,
        email ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        pin ?? null,
        license ?? null,
        status ?? null,
        lat !== undefined ? Number(lat) : null,
        lng !== undefined ? Number(lng) : null,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT id, name, owner, phone, email, address, city, state, pin, license, status,
              CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created
       FROM partner_medical_shops WHERE id = ?`,
      [id]
    );
    return success(res, updated, "Partner shop updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await query("DELETE FROM partner_medical_shops WHERE id = ?", [id]);
    return success(res, { id }, "Partner shop deleted successfully");
  } catch (err) {
    next(err);
  }
}

export async function getPartnerMedicines(req, res, next) {
  try {
    const rows = await query(
      `SELECT psm.id, psm.partner_shop_id AS shopId, psm.medicine_name AS medicineName,
              psm.quantity, CAST(COALESCE(psm.price, 0) AS DOUBLE) AS price,
              psm.last_updated AS lastUpdated,
              ps.name AS shopName
       FROM partner_shop_medicines psm
       JOIN partner_medical_shops ps ON psm.partner_shop_id = ps.id
       ORDER BY ps.name ASC, psm.medicine_name ASC`
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

export async function getShopMedicines(req, res, next) {
  try {
    const { id } = req.params;
    const medicines = await query(
      `SELECT psm.id, psm.partner_shop_id AS shopId, psm.medicine_id AS medicineId,
              psm.medicine_name AS medicineName, psm.quantity,
              CAST(COALESCE(psm.price, m.selling_price, 0) AS DOUBLE) AS price,
              psm.last_updated AS lastUpdated,
              COALESCE(m.generic, 'Generic Formula') AS generic,
              COALESCE(m.dosage, 'Standard') AS dosage,
              COALESCE(m.type, 'OTC') AS type,
              COALESCE(m.brand, 'Standard Brand') AS brand,
              COALESCE(c.name, 'General') AS category
       FROM partner_shop_medicines psm
       LEFT JOIN medicines m ON psm.medicine_id = m.id
       LEFT JOIN categories c ON m.category_id = c.id
       WHERE psm.partner_shop_id = ?
       ORDER BY psm.medicine_name ASC`,
      [id]
    );
    return success(res, medicines);
  } catch (err) {
    next(err);
  }
}

export async function addShopMedicine(req, res, next) {
  try {
    const { id } = req.params;
    const { medicineName, medicineId, quantity, price } = req.body;
    if (!medicineName) {
      return error(res, "Medicine name is required.", 400);
    }
    const now = new Date();
    const lastUpdated =
      now.toISOString().slice(0, 10) +
      " " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let resolvedMedId = medicineId || null;
    if (resolvedMedId) {
      const medCheck = await query("SELECT id FROM medicines WHERE id = ?", [resolvedMedId]);
      if (medCheck.length === 0) resolvedMedId = null;
    }

    const result = await query(
      `INSERT INTO partner_shop_medicines (partner_shop_id, medicine_id, medicine_name, quantity, price, last_updated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, resolvedMedId, medicineName, Number(quantity) || 0, Number(price) || 0, lastUpdated]
    );

    const [created] = await query(
      `SELECT psm.id, psm.partner_shop_id AS shopId, psm.medicine_id AS medicineId,
              psm.medicine_name AS medicineName, psm.quantity,
              CAST(psm.price AS DOUBLE) AS price, psm.last_updated AS lastUpdated
       FROM partner_shop_medicines psm WHERE psm.id = ?`,
      [result.insertId]
    );

    return success(res, created, "Medicine added to partner shop successfully", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateShopMedicine(req, res, next) {
  try {
    const { id, medId } = req.params;
    const { quantity, price, medicineName } = req.body;
    const now = new Date();
    const lastUpdated =
      now.toISOString().slice(0, 10) +
      " " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    await query(
      `UPDATE partner_shop_medicines
       SET quantity = COALESCE(?, quantity),
           price = COALESCE(?, price),
           medicine_name = COALESCE(?, medicine_name),
           last_updated = ?
       WHERE id = ? AND partner_shop_id = ?`,
      [
        quantity !== undefined ? Number(quantity) : null,
        price !== undefined ? Number(price) : null,
        medicineName || null,
        lastUpdated,
        medId,
        id,
      ]
    );

    const [updated] = await query(
      `SELECT psm.id, psm.partner_shop_id AS shopId, psm.medicine_id AS medicineId,
              psm.medicine_name AS medicineName, psm.quantity,
              CAST(psm.price AS DOUBLE) AS price, psm.last_updated AS lastUpdated
       FROM partner_shop_medicines psm WHERE psm.id = ?`,
      [medId]
    );

    return success(res, updated, "Partner medicine stock updated");
  } catch (err) {
    next(err);
  }
}

export async function deleteShopMedicine(req, res, next) {
  try {
    const { id, medId } = req.params;
    await query("DELETE FROM partner_shop_medicines WHERE id = ? AND partner_shop_id = ?", [
      medId,
      id,
    ]);
    return success(res, { id: medId }, "Medicine removed from partner shop");
  } catch (err) {
    next(err);
  }
}
