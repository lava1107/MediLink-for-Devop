import { query } from "../config/db.js";
import { success, error } from "../utils/response.js";

export async function getReport(req, res, next) {
  try {
    const { key } = req.params;

    switch (key) {
      case "daily-sales":
      case "monthly-sales": {
        const sales = await query(
          `SELECT s.id, s.bill, s.customer_name AS customer, b.name AS branch,
                  CAST(s.amount AS DOUBLE) AS amount, s.payment,
                  DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS date
           FROM sales s
           JOIN branches b ON s.branch_id = b.id
           ORDER BY s.sale_date DESC, s.id DESC`
        );
        return success(res, sales);
      }

      case "purchase": {
        const purchases = await query(
          `SELECT p.id, p.invoice, s.name AS supplier, b.name AS branch,
                  CAST(p.amount AS DOUBLE) AS amount, p.payment,
                  DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date
           FROM purchases p
           JOIN suppliers s ON p.supplier_id = s.id
           JOIN branches b ON p.branch_id = b.id
           ORDER BY p.purchase_date DESC, p.id DESC`
        );
        return success(res, purchases);
      }

      case "supplier": {
        const suppliers = await query(
          `SELECT s.id, s.name, s.city, s.gst,
                  COALESCE(SUM(p.amount), 0) AS totalPurchased
           FROM suppliers s
           LEFT JOIN purchases p ON p.supplier_id = s.id
           GROUP BY s.id
           ORDER BY totalPurchased DESC`
        );
        return success(res, suppliers.map((s) => ({ ...s, totalPurchased: Number(s.totalPurchased) })));
      }

      case "customer": {
        const customers = await query(
          `SELECT c.id, c.name, c.phone,
                  COUNT(s.id) AS orders,
                  COALESCE(SUM(s.amount), 0) AS totalSpend
           FROM customers c
           LEFT JOIN sales s ON (s.customer_id = c.id OR s.customer_name = c.name)
           GROUP BY c.id
           ORDER BY totalSpend DESC`
        );
        return success(res, customers.map((c) => ({ ...c, orders: Number(c.orders), totalSpend: Number(c.totalSpend) })));
      }

      case "medicine": {
        const medicines = await query(
          `SELECT m.id, m.name, c.name AS category,
                  COALESCE(SUM(CASE WHEN b.status != 'Expired' AND b.available > 0 THEN b.available ELSE 0 END), 0) AS stock,
                  CAST(m.selling_price AS DOUBLE) AS price
           FROM medicines m
           JOIN categories c ON m.category_id = c.id
           LEFT JOIN medicine_batches b ON b.medicine_id = m.id
           GROUP BY m.id
           ORDER BY m.name ASC`
        );
        return success(res, medicines.map((m) => ({ ...m, stock: Number(m.stock) })));
      }

      case "branch-sales": {
        const branchSales = await query(
          `SELECT b.id, b.name,
                  COUNT(s.id) AS bills,
                  COALESCE(SUM(s.amount), 0) AS revenue
           FROM branches b
           LEFT JOIN sales s ON s.branch_id = b.id
           GROUP BY b.id
           ORDER BY revenue DESC`
        );
        return success(res, branchSales.map((b) => ({ ...b, bills: Number(b.bills), revenue: Number(b.revenue) })));
      }

      case "reservation": {
        const reservations = await query(
          `SELECT r.id, r.customer_name AS customer, r.medicine_name AS medicine,
                  r.branch_name AS branch, r.status,
                  DATE_FORMAT(r.res_date, '%Y-%m-%d') AS date
           FROM reservations r
           ORDER BY r.res_date DESC`
        );
        return success(res, reservations);
      }

      case "low-stock": {
        const lowStock = await query(
          `SELECT b.id, m.name AS medicineName, br.name AS branchName,
                  b.available, b.rack
           FROM medicine_batches b
           JOIN medicines m ON b.medicine_id = m.id
           JOIN branches br ON b.branch_id = br.id
           WHERE b.available > 0 AND b.available <= 20
           ORDER BY b.available ASC`
        );
        return success(res, lowStock);
      }

      case "near-expiry": {
        const nearExpiry = await query(
          `SELECT b.id, m.name AS medicineName, br.name AS branchName,
                  b.batch_no AS batchNo,
                  DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate
           FROM medicine_batches b
           JOIN medicines m ON b.medicine_id = m.id
           JOIN branches br ON b.branch_id = br.id
           WHERE b.status = 'Expiring Soon'
           ORDER BY b.expiry_date ASC`
        );
        return success(res, nearExpiry);
      }

      case "expired": {
        const expired = await query(
          `SELECT b.id, m.name AS medicineName, br.name AS branchName,
                  b.batch_no AS batchNo,
                  DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate
           FROM medicine_batches b
           JOIN medicines m ON b.medicine_id = m.id
           JOIN branches br ON b.branch_id = br.id
           WHERE b.status = 'Expired'
           ORDER BY b.expiry_date ASC`
        );
        return success(res, expired);
      }

      default:
        return error(res, `Unknown report type '${key}'.`, 404);
    }
  } catch (err) {
    next(err);
  }
}
