import { query } from "../config/db.js";
import { calculateDistance } from "../services/geoService.js";
import { success, error } from "../utils/response.js";

export async function checkAvailability(req, res, next) {
  try {
    const searchQuery = req.query.query || req.query.medicine || req.query.q;
    const branchName = req.query.branchName || req.query.branch || req.query.branchId;
    const branchRadius = req.query.branchRadius || req.query.radius || 25;
    const partnerRadius = req.query.partnerRadius || 5;

    if (!searchQuery || !searchQuery.trim()) {
      return error(res, "Search query is required.", 400);
    }

    const q = searchQuery.trim().toLowerCase();

    // Find medicine
    const medicines = await query(
      `SELECT m.id, m.name, m.generic, m.brand, m.strength, m.dosage, m.type, m.rx,
              CAST(m.selling_price AS DOUBLE) AS selling, c.name AS category
       FROM medicines m
       JOIN categories c ON m.category_id = c.id
       WHERE LOWER(m.name) LIKE ? OR LOWER(m.generic) LIKE ? OR LOWER(m.brand) LIKE ?
       LIMIT 1`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    if (medicines.length === 0) {
      return success(res, { notFound: true, query: searchQuery });
    }

    const med = medicines[0];
    med.rx = Boolean(med.rx);

    // Resolve current branch
    let currentBranch = null;
    if (branchName) {
      const branches = await query(
        "SELECT id, name, CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng, address, city, phone FROM branches WHERE LOWER(name) = LOWER(?) OR id = ?",
        [branchName, branchName]
      );
      if (branches.length > 0) currentBranch = branches[0];
    }

    if (!currentBranch) {
      const defaultBranches = await query("SELECT id, name, CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng, address, city, phone FROM branches LIMIT 1");
      currentBranch = defaultBranches[0];
    }

    // Level 1: Current Branch check
    const homeBatches = await query(
      `SELECT b.id, b.batch_no AS batchNo, b.medicine_id AS medicineId, m.name AS medicineName,
              b.branch_id AS branchId, br.name AS branchName,
              DATE_FORMAT(b.mfg_date, '%Y-%m-%d') AS mfgDate,
              DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
              b.quantity, b.available,
              CAST(b.selling_price AS DOUBLE) AS sellingPrice,
              b.rack, b.status
       FROM medicine_batches b
       JOIN medicines m ON b.medicine_id = m.id
       JOIN branches br ON b.branch_id = br.id
       WHERE b.medicine_id = ? AND b.branch_id = ? AND b.status != 'Expired' AND b.available > 0
       ORDER BY b.expiry_date ASC LIMIT 1`,
      [med.id, currentBranch.id]
    );

    const homeBatch = homeBatches.length > 0 ? homeBatches[0] : null;

    let nearbyBranches = [];
    let nearbyPartners = [];

    // Level 2: If unavailable in home branch, check other branches within branchRadius
    if (!homeBatch) {
      const otherBranches = await query(
        `SELECT b.id, b.name, CAST(b.lat AS DOUBLE) AS lat, CAST(b.lng AS DOUBLE) AS lng,
                b.address, b.city, b.phone, b.opening, b.closing
         FROM branches b
         WHERE b.id != ? AND b.status = 'Active'`,
        [currentBranch.id]
      );

      for (const ob of otherBranches) {
        const dist = calculateDistance(currentBranch.lat, currentBranch.lng, ob.lat, ob.lng);
        if (dist !== null && dist <= Number(branchRadius)) {
          const [bMatch] = await query(
            `SELECT b.id, b.batch_no AS batchNo, b.available,
                    DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
                    CAST(b.selling_price AS DOUBLE) AS sellingPrice, b.rack
             FROM medicine_batches b
             WHERE b.medicine_id = ? AND b.branch_id = ? AND b.status != 'Expired' AND b.available > 0
             ORDER BY b.expiry_date ASC LIMIT 1`,
            [med.id, ob.id]
          );

          if (bMatch) {
            nearbyBranches.push({
              branch: ob,
              batch: bMatch,
              distance: dist,
            });
          }
        }
      }

      nearbyBranches.sort((a, b) => a.distance - b.distance);
    }

    // Level 3: If unavailable in network, check nearby registered partner medical shops within partnerRadius
    if (!homeBatch && nearbyBranches.length === 0) {
      const partnerShops = await query(
        `SELECT ps.id, ps.name, ps.owner, ps.phone, ps.address, ps.city, ps.license,
                CAST(ps.lat AS DOUBLE) AS lat, CAST(ps.lng AS DOUBLE) AS lng,
                psm.quantity, psm.last_updated AS lastUpdated
         FROM partner_medical_shops ps
         JOIN partner_shop_medicines psm ON psm.partner_shop_id = ps.id
         WHERE ps.status = 'Active' AND (LOWER(psm.medicine_name) = LOWER(?) OR psm.medicine_id = ?)`,
        [med.name, med.id]
      );

      for (const ps of partnerShops) {
        const dist = calculateDistance(currentBranch.lat, currentBranch.lng, ps.lat, ps.lng);
        if (dist !== null && dist <= Number(partnerRadius)) {
          nearbyPartners.push({
            shop: {
              id: ps.id,
              name: ps.name,
              owner: ps.owner,
              phone: ps.phone,
              address: ps.address,
              city: ps.city,
              license: ps.license,
              lat: ps.lat,
              lng: ps.lng,
            },
            medicineName: med.name,
            quantity: ps.quantity,
            lastUpdated: ps.lastUpdated,
            distance: dist,
          });
        }
      }

      nearbyPartners.sort((a, b) => a.distance - b.distance);
    }

    return success(res, {
      med,
      homeBatch,
      nearbyBranches,
      nearbyPartners,
    });
  } catch (err) {
    next(err);
  }
}
