import { query } from "../config/db.js";
import { success } from "../utils/response.js";

export async function getBootstrapData(req, res, next) {
  try {
    const [
      branches,
      categories,
      suppliers,
      medicines,
      batches,
      customers,
      users,
      sales,
      purchases,
      reservations,
      partnerShops,
      partnerAvailability,
      prescriptions,
      notifications,
    ] = await Promise.all([
      query(`
        SELECT id, name, manager, address, city, state, pin, phone, email,
               opening, closing, status, staff, is_hq AS isHQ,
               CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng
        FROM branches ORDER BY id ASC
      `),
      query(`SELECT id, name, description, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS created FROM categories ORDER BY id ASC`),
      query(`SELECT id, name, company, contact, phone, email, address, city, state, gst, license, status, DATE_FORMAT(created_at, '%Y-%m-%d') AS created FROM suppliers ORDER BY id ASC`),
      query(`
        SELECT m.id, m.name, m.generic, m.brand, m.manufacturer, m.dosage, m.strength,
               m.type, m.rx,
               CAST(m.purchase_price AS DOUBLE) AS purchase,
               CAST(m.selling_price AS DOUBLE) AS selling,
               CAST(m.gst AS DOUBLE) AS gst,
               m.status, c.name AS category,
               COALESCE(SUM(CASE WHEN b.status != 'Expired' AND b.available > 0 THEN b.available ELSE 0 END), 0) AS stock
        FROM medicines m
        JOIN categories c ON m.category_id = c.id
        LEFT JOIN medicine_batches b ON b.medicine_id = m.id
        GROUP BY m.id
        ORDER BY m.id ASC
      `),
      query(`
        SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
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
        ORDER BY b.expiry_date ASC
      `),
      query(`SELECT id, name, phone, email, address, rx_ref AS rxRef, DATE_FORMAT(created_at, '%Y-%m-%d') AS created FROM customers ORDER BY id ASC`),
      query(`
        SELECT u.id, u.name, u.username, u.email, u.phone, u.status,
               u.last_login AS lastLogin, DATE_FORMAT(u.created_at, '%Y-%m-%d') AS created,
               r.name AS role, b.name AS branch, b.id AS branch_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN branches b ON u.branch_id = b.id
        ORDER BY u.id ASC
      `),
      query(`
        SELECT s.id, s.bill, s.customer_name AS customer, s.pharmacist_name AS pharmacist,
               b.name AS branch,
               CAST(s.amount AS DOUBLE) AS amount,
               s.payment,
               DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS date,
               s.status
        FROM sales s
        JOIN branches b ON s.branch_id = b.id
        ORDER BY s.sale_date DESC, s.id DESC
      `),
      query(`
        SELECT p.id, p.invoice, s.name AS supplier, b.name AS branch,
               p.purchased_by AS purchasedBy,
               DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
               CAST(p.amount AS DOUBLE) AS amount,
               p.payment, p.status
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        JOIN branches b ON p.branch_id = b.id
        ORDER BY p.purchase_date DESC, p.id DESC
      `),
      query(`
        SELECT r.id, r.customer_name AS customer,
               COALESCE(r.customer_phone, c.phone, '') AS phone,
               COALESCE(r.customer_phone, c.phone, '') AS customerPhone,
               r.customer_id AS customerId,
               r.medicine_name AS medicine, r.medicine_id AS medicineId,
               r.branch_name AS branch, r.branch_id AS branchId,
               r.quantity,
               DATE_FORMAT(r.res_date, '%Y-%m-%d') AS resDate,
               DATE_FORMAT(r.expiry, '%Y-%m-%d') AS expiry,
               r.status, r.created_by AS createdBy
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        ORDER BY r.res_date DESC, r.id DESC
      `),
      query(`
        SELECT id, name, owner, phone, email, address, city, state, pin, license, status,
               CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng,
               DATE_FORMAT(created_at, '%Y-%m-%d') AS created
        FROM partner_medical_shops ORDER BY id ASC
      `),
      query(`
        SELECT psm.id, psm.partner_shop_id AS shopId, psm.medicine_id AS medicineId,
               psm.medicine_name AS medicineName,
               psm.quantity, CAST(COALESCE(psm.price, 0) AS DOUBLE) AS price,
               psm.last_updated AS lastUpdated
        FROM partner_shop_medicines psm
      `),
      query(`
        SELECT p.id, p.customer_id AS customerId, p.customer_name AS customerName,
               p.medicine, p.quantity, p.doctor_name AS doctorName,
               DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS prescriptionDate,
               p.prescription_ref AS prescriptionRef,
               p.status, p.verified_by AS verifiedBy, p.verified_date AS verifiedDate,
               p.remarks
        FROM prescriptions p
        ORDER BY p.id DESC
      `),
      query(`SELECT id, type, title, \`desc\`, time, \`read\` FROM notifications ORDER BY id DESC`),
    ]);

    const formattedMedicines = medicines.map((m) => ({
      ...m,
      rx: Boolean(m.rx),
    }));

    const formattedNotifications = notifications.map((n) => ({
      ...n,
      read: Boolean(n.read),
    }));

    return success(res, {
      branches,
      categories,
      suppliers,
      medicines: formattedMedicines,
      batches,
      customers,
      users,
      sales,
      purchases,
      reservations,
      partnerShops,
      partnerAvailability,
      prescriptions,
      notifications: formattedNotifications,
    });
  } catch (err) {
    next(err);
  }
}
