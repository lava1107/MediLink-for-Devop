import { query } from "../config/db.js";
import { success } from "../utils/response.js";

export async function getStats(req, res, next) {
  try {
    const { branch, role } = req.query;

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonth = todayStr.slice(0, 7);

    // 1. Core entity counts
    const [[{ totalMedicines }]] = await query("SELECT COUNT(*) AS totalMedicines FROM medicines WHERE status = 'Active'");
    const [[{ totalCategories }]] = await query("SELECT COUNT(*) AS totalCategories FROM categories WHERE status = 'Active'");
    const [[{ totalSuppliers }]] = await query("SELECT COUNT(*) AS totalSuppliers FROM suppliers WHERE status = 'Active'");
    const [[{ totalCustomers }]] = await query("SELECT COUNT(*) AS totalCustomers FROM customers");
    const [[{ totalBranches }]] = await query("SELECT COUNT(*) AS totalBranches FROM branches WHERE status = 'Active'");
    const [[{ totalPurchases }]] = await query("SELECT COUNT(*) AS totalPurchases FROM purchases");

    // 2. Stock metrics (filter by branch if specified)
    let batchFilter = "";
    const batchParams = [];
    if (branch) {
      batchFilter = "JOIN branches br ON b.branch_id = br.id WHERE (br.name = ? OR br.id = ?)";
      batchParams.push(branch, branch);
    }

    const [[{ lowStock }]] = await query(
      `SELECT COUNT(*) AS lowStock FROM medicine_batches b ${batchFilter} ${batchFilter ? "AND" : "WHERE"} b.available > 0 AND b.available <= 20`,
      batchParams
    );

    const [[{ nearExpiry }]] = await query(
      `SELECT COUNT(*) AS nearExpiry FROM medicine_batches b ${batchFilter} ${batchFilter ? "AND" : "WHERE"} b.status = 'Expiring Soon'`,
      batchParams
    );

    const [[{ expired }]] = await query(
      `SELECT COUNT(*) AS expired FROM medicine_batches b ${batchFilter} ${batchFilter ? "AND" : "WHERE"} b.status = 'Expired'`,
      batchParams
    );

    // 3. Reservations metrics
    let resFilter = "WHERE (status = 'Pending' OR status = 'Reserved')";
    const resParams = [];
    if (branch) {
      resFilter += " AND (branch_name = ? OR branch_id = ?)";
      resParams.push(branch, branch);
    }
    const [[{ activeReservations }]] = await query(
      `SELECT COUNT(*) AS activeReservations FROM reservations ${resFilter}`,
      resParams
    );

    // 4. Sales metrics
    let salesFilter = "";
    const salesParams = [];
    if (branch) {
      salesFilter = "JOIN branches br ON s.branch_id = br.id WHERE (br.name = ? OR br.id = ?)";
      salesParams.push(branch, branch);
    }

    const [[{ todaySales }]] = await query(
      `SELECT COALESCE(SUM(s.amount), 0) AS todaySales
       FROM sales s ${salesFilter} ${salesFilter ? "AND" : "WHERE"} s.sale_date = ?`,
      [...salesParams, todayStr]
    );

    const [[{ todayBills }]] = await query(
      `SELECT COUNT(*) AS todayBills
       FROM sales s ${salesFilter} ${salesFilter ? "AND" : "WHERE"} s.sale_date = ?`,
      [...salesParams, todayStr]
    );

    const [[{ monthlyRevenue }]] = await query(
      `SELECT COALESCE(SUM(s.amount), 0) AS monthlyRevenue
       FROM sales s ${salesFilter} ${salesFilter ? "AND" : "WHERE"} s.sale_date LIKE ?`,
      [...salesParams, `${currentMonth}%`]
    );

    // 5. Chart trends
    // Weekly sales trend
    const weeklySales = await query(
      `SELECT DATE_FORMAT(sale_date, '%a') AS name, COALESCE(SUM(amount), 0) AS sales
       FROM sales
       GROUP BY sale_date
       ORDER BY sale_date ASC
       LIMIT 7`
    );

    // Monthly purchase trend
    const monthlyPurchases = await query(
      `SELECT DATE_FORMAT(purchase_date, '%b') AS name, COALESCE(SUM(amount), 0) AS purchase
       FROM purchases
       GROUP BY DATE_FORMAT(purchase_date, '%Y-%m')
       ORDER BY purchase_date ASC
       LIMIT 6`
    );

    // Branch performance
    const branchPerf = await query(
      `SELECT b.name, COALESCE(SUM(s.amount), 0) AS revenue
       FROM branches b
       LEFT JOIN sales s ON s.branch_id = b.id
       GROUP BY b.id
       ORDER BY revenue DESC`
    );

    // Top selling medicines
    const topMeds = await query(
      `SELECT m.name, COALESCE(SUM(si.quantity), 0) AS units
       FROM medicines m
       JOIN sale_items si ON si.medicine_id = m.id
       GROUP BY m.id
       ORDER BY units DESC
       LIMIT 5`
    );

    return success(res, {
      totalMedicines: Number(totalMedicines),
      totalCategories: Number(totalCategories),
      totalSuppliers: Number(totalSuppliers),
      totalCustomers: Number(totalCustomers),
      totalBranches: Number(totalBranches),
      totalPurchases: Number(totalPurchases),
      lowStock: Number(lowStock),
      nearExpiry: Number(nearExpiry),
      expired: Number(expired),
      activeReservations: Number(activeReservations),
      todaySales: Number(todaySales),
      todayBills: Number(todayBills),
      monthlyRevenue: Number(monthlyRevenue),
      salesTrend: weeklySales.map((w) => ({ name: w.name, sales: Number(w.sales) })),
      purchaseTrend: monthlyPurchases.map((m) => ({ name: m.name, purchase: Number(m.purchase) })),
      branchPerf: branchPerf.map((b) => ({ name: b.name, revenue: Number(b.revenue) })),
      topMeds: topMeds.map((m) => ({ name: m.name, units: Number(m.units) })),
    });
  } catch (err) {
    next(err);
  }
}
