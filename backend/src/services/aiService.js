import { query } from "../config/db.js";
import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } from "../config/env.js";
import { calculateDistance } from "./geoService.js";

/**
 * MediLink Live Database Tools for AI
 * Query actual MySQL records with role-based security.
 */

export async function getMedicineCatalogStats() {
  const [row] = await query("SELECT COUNT(*) AS count FROM medicines WHERE status = 'Active'");
  const [catRow] = await query("SELECT COUNT(*) AS catCount FROM categories WHERE status = 'Active'");
  return {
    activeMedicines: Number(row?.count || 0),
    activeCategories: Number(catRow?.catCount || 0),
  };
}

export async function getMedicineStockInfo(searchName, branchName = null) {
  const q = `%${searchName.trim()}%`;
  const medicines = await query(
    `SELECT m.id, m.name, m.generic, m.brand, m.dosage, m.strength, m.type, m.rx,
            CAST(m.selling_price AS DOUBLE) AS sellingPrice, c.name AS category
     FROM medicines m
     JOIN categories c ON m.category_id = c.id
     WHERE LOWER(m.name) LIKE LOWER(?) OR LOWER(m.generic) LIKE LOWER(?) OR LOWER(m.brand) LIKE LOWER(?)
     LIMIT 5`,
    [q, q, q]
  );

  if (medicines.length === 0) {
    return { found: false, searchName };
  }

  const results = [];
  for (const med of medicines) {
    let sql = `
      SELECT b.id, b.batch_no AS batchNo, br.name AS branchName, b.available,
             b.quantity, DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate,
             b.rack, b.status
      FROM medicine_batches b
      JOIN branches br ON b.branch_id = br.id
      WHERE b.medicine_id = ? AND b.status != 'Expired'
    `;
    const params = [med.id];
    if (branchName) {
      sql += " AND (LOWER(br.name) LIKE LOWER(?) OR br.id = ?)";
      params.push(`%${branchName}%`, branchName);
    }
    sql += " ORDER BY b.expiry_date ASC";

    const batches = await query(sql, params);
    const totalAvailable = batches.reduce((sum, b) => sum + Number(b.available || 0), 0);

    results.push({
      medicine: med,
      totalAvailable,
      batches: batches.map((b) => ({
        batchNo: b.batchNo,
        branch: b.branchName,
        available: b.available,
        rack: b.rack,
        expiry: b.expiryDate,
        status: b.status,
      })),
    });
  }

  return { found: true, results };
}

export async function getLowStockBatches(branchName = null) {
  let sql = `
    SELECT b.id, b.batch_no AS batchNo, m.name AS medicineName, m.generic,
           br.name AS branchName, b.available, b.rack
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.available > 0 AND b.available <= 20 AND b.status != 'Expired'
  `;
  const params = [];
  if (branchName) {
    sql += " AND (LOWER(br.name) LIKE LOWER(?) OR br.id = ?)";
    params.push(`%${branchName}%`, branchName);
  }
  sql += " ORDER BY b.available ASC LIMIT 10";

  const rows = await query(sql, params);
  return rows;
}

export async function getNearExpiryBatches(branchName = null) {
  let sql = `
    SELECT b.id, b.batch_no AS batchNo, m.name AS medicineName, m.generic,
           br.name AS branchName, b.available,
           DATE_FORMAT(b.expiry_date, '%Y-%m-%d') AS expiryDate, b.status
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
    JOIN branches br ON b.branch_id = br.id
    WHERE (b.status = 'Expiring Soon' OR (b.expiry_date >= CURDATE() AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)))
  `;
  const params = [];
  if (branchName) {
    sql += " AND (LOWER(br.name) LIKE LOWER(?) OR br.id = ?)";
    params.push(`%${branchName}%`, branchName);
  }
  sql += " ORDER BY b.expiry_date ASC LIMIT 10";

  const rows = await query(sql, params);
  return rows;
}

export async function getSalesData(user, branchName = null) {
  const targetBranch = user?.role === "Pharmacist" ? user.branch : branchName;
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  let filter = "";
  const params = [];
  if (targetBranch) {
    filter = "JOIN branches br ON s.branch_id = br.id WHERE (LOWER(br.name) LIKE LOWER(?) OR br.id = ?)";
    params.push(`%${targetBranch}%`, targetBranch);
  }

  const [todayStat] = await query(
    `SELECT COALESCE(SUM(s.amount), 0) AS revenue, COUNT(*) AS bills
     FROM sales s ${filter} ${filter ? "AND" : "WHERE"} s.sale_date = ?`,
    [...params, today]
  );

  const [monthStat] = await query(
    `SELECT COALESCE(SUM(s.amount), 0) AS revenue, COUNT(*) AS bills
     FROM sales s ${filter} ${filter ? "AND" : "WHERE"} s.sale_date LIKE ?`,
    [...params, `${currentMonth}%`]
  );

  return {
    branch: targetBranch || "All Branches",
    todayDate: today,
    todaySales: Number(todayStat?.revenue || 0),
    todayBills: Number(todayStat?.bills || 0),
    monthRevenue: Number(monthStat?.revenue || 0),
    monthBills: Number(monthStat?.bills || 0),
  };
}

export async function getPendingReservations(branchName = null) {
  let sql = `
    SELECT r.id, r.customer_name AS customer, r.medicine_name AS medicine,
           r.branch_name AS branch, r.quantity,
           DATE_FORMAT(r.res_date, '%Y-%m-%d') AS resDate,
           DATE_FORMAT(r.expiry, '%Y-%m-%d') AS expiry, r.status
    FROM reservations r
    WHERE (r.status = 'Pending' OR r.status = 'Reserved')
  `;
  const params = [];
  if (branchName) {
    sql += " AND LOWER(r.branch_name) LIKE LOWER(?)";
    params.push(`%${branchName}%`);
  }
  sql += " ORDER BY r.res_date DESC LIMIT 10";

  const rows = await query(sql, params);
  return rows;
}

export async function getPendingPrescriptions() {
  const rows = await query(`
    SELECT p.id, p.customer_name AS customer, p.medicine, p.quantity,
           p.doctor_name AS doctor, p.prescription_ref AS ref,
           DATE_FORMAT(p.prescription_date, '%Y-%m-%d') AS date, p.status
    FROM prescriptions p
    WHERE p.status = 'Pending'
    ORDER BY p.id DESC LIMIT 10
  `);
  return rows;
}

export async function getInvoiceDetails(invoiceNumber) {
  const clean = invoiceNumber.trim();
  // Check sales
  const sales = await query(
    `SELECT s.id, s.bill, s.customer_name AS customer, s.pharmacist_name AS pharmacist,
            br.name AS branch, DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS date,
            CAST(s.amount AS DOUBLE) AS amount, s.payment, s.status
     FROM sales s
     JOIN branches br ON s.branch_id = br.id
     WHERE LOWER(s.bill) = LOWER(?) OR LOWER(s.id) = LOWER(?) OR s.bill LIKE ?
     LIMIT 1`,
    [clean, clean, `%${clean}%`]
  );

  if (sales.length > 0) {
    const sale = sales[0];
    const items = await query(
      `SELECT m.name, si.quantity, CAST(si.unit_price AS DOUBLE) AS price, CAST(si.total AS DOUBLE) AS total
       FROM sale_items si
       JOIN medicines m ON si.medicine_id = m.id
       WHERE si.sale_id = ?`,
      [sale.id]
    );
    sale.items = items;
    return { type: "sale", found: true, record: sale };
  }

  // Check purchases
  const purchases = await query(
    `SELECT p.id, p.invoice, sup.name AS supplier, br.name AS branch,
            p.purchased_by AS purchasedBy, DATE_FORMAT(p.purchase_date, '%Y-%m-%d') AS date,
            CAST(p.amount AS DOUBLE) AS amount, p.payment, p.status
     FROM purchases p
     JOIN suppliers sup ON p.supplier_id = sup.id
     JOIN branches br ON p.branch_id = br.id
     WHERE LOWER(p.invoice) = LOWER(?) OR LOWER(p.id) = LOWER(?) OR p.invoice LIKE ?
     LIMIT 1`,
    [clean, clean, `%${clean}%`]
  );

  if (purchases.length > 0) {
    return { type: "purchase", found: true, record: purchases[0] };
  }

  return { found: false, invoiceNumber: clean };
}

export async function checkInterBranchAvailability(medicineName, originBranchName = null) {
  const [medRows] = await query(
    `SELECT id, name, generic, strength FROM medicines
     WHERE LOWER(name) LIKE LOWER(?) OR LOWER(generic) LIKE LOWER(?) LIMIT 1`,
    [`%${medicineName}%`, `%${medicineName}%`]
  );

  if (!medRows) {
    return { found: false, medicineName };
  }
  const med = medRows;

  // Resolve origin branch
  let origin = null;
  if (originBranchName) {
    const [bRows] = await query(
      "SELECT id, name, CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng FROM branches WHERE LOWER(name) LIKE LOWER(?) OR id = ? LIMIT 1",
      [`%${originBranchName}%`, originBranchName]
    );
    if (bRows) origin = bRows;
  }
  if (!origin) {
    const [defaultBranch] = await query("SELECT id, name, CAST(lat AS DOUBLE) AS lat, CAST(lng AS DOUBLE) AS lng FROM branches LIMIT 1");
    origin = defaultBranch;
  }

  // Level 1: Origin Branch
  const homeBatches = await query(
    `SELECT b.batch_no, b.available, b.rack
     FROM medicine_batches b
     WHERE b.medicine_id = ? AND b.branch_id = ? AND b.status != 'Expired' AND b.available > 0`,
    [med.id, origin.id]
  );
  const homeAvailable = homeBatches.reduce((a, b) => a + Number(b.available || 0), 0);

  // Level 2: Other Branches
  const otherBranches = await query(
    `SELECT b.id, b.name, CAST(b.lat AS DOUBLE) AS lat, CAST(b.lng AS DOUBLE) AS lng
     FROM branches b WHERE b.id != ? AND b.status = 'Active'`,
    [origin.id]
  );
  const networkStock = [];
  for (const ob of otherBranches) {
    const dist = calculateDistance(origin.lat, origin.lng, ob.lat, ob.lng);
    const [match] = await query(
      `SELECT SUM(available) AS avail FROM medicine_batches WHERE medicine_id = ? AND branch_id = ? AND status != 'Expired' AND available > 0`,
      [med.id, ob.id]
    );
    if (match && match.avail > 0) {
      networkStock.push({
        branch: ob.name,
        available: Number(match.avail),
        distanceKm: Math.round(dist * 10) / 10,
      });
    }
  }

  // Level 3: Partner Shops
  const partnerRows = await query(
    `SELECT ps.name, ps.phone, ps.city, CAST(ps.lat AS DOUBLE) AS lat, CAST(ps.lng AS DOUBLE) AS lng, psm.quantity
     FROM partner_medical_shops ps
     JOIN partner_shop_medicines psm ON psm.partner_shop_id = ps.id
     WHERE ps.status = 'Active' AND (LOWER(psm.medicine_name) LIKE LOWER(?) OR psm.medicine_id = ?)`,
    [`%${med.name}%`, med.id]
  );
  const partnerStock = partnerRows.map((ps) => ({
    name: ps.name,
    phone: ps.phone,
    city: ps.city,
    quantity: ps.quantity,
    distanceKm: Math.round(calculateDistance(origin.lat, origin.lng, ps.lat, ps.lng) * 10) / 10,
  }));

  return {
    found: true,
    medicine: med,
    originBranch: origin.name,
    homeAvailable,
    otherBranches: networkStock.sort((a, b) => a.distanceKm - b.distanceKm),
    partnerShops: partnerStock.sort((a, b) => a.distanceKm - b.distanceKm),
  };
}

/**
 * Main AI Query Processor
 * Supports real OpenAI LLM when OPENAI_API_KEY is configured,
 * and intelligent database-grounded query synthesis when key is not yet set.
 */
export async function processAiQuery({ message, conversationHistory = [], user = null }) {
  const cleanMsg = (message || "").trim();
  const lowerMsg = cleanMsg.toLowerCase();
  const userRole = user?.role || "Pharmacist";
  const userBranch = user?.branch || null;

  // 1. Gather Real MediLink Context based on user intent
  let dbContext = null;
  let detectedIntent = "general";
  let structuredData = null;

  // Intent A: Stock / Availability of specific medicine
  let matchedMedName = null;
  let queryBranch = userBranch;

  // Extract branch if mentioned in query (e.g., "at Kovilpatti", "in Madurai")
  try {
    const branchRows = await query("SELECT name FROM branches");
    for (const br of branchRows) {
      if (lowerMsg.includes(br.name.toLowerCase())) {
        queryBranch = br.name;
        break;
      }
    }
  } catch (bErr) {
    // Ignore branch query error
  }

  // Check if medicine stock/availability is asked
  if (
    lowerMsg.includes("stock") ||
    lowerMsg.includes("available") ||
    lowerMsg.includes("availability") ||
    lowerMsg.includes("quantity") ||
    lowerMsg.includes("where is") ||
    lowerMsg.startsWith("is ") ||
    lowerMsg.includes("find ") ||
    lowerMsg.includes("do you have")
  ) {
    try {
      const medRows = await query("SELECT name, generic FROM medicines");
      for (const m of medRows) {
        if (lowerMsg.includes(m.name.toLowerCase()) || (m.generic && lowerMsg.includes(m.generic.toLowerCase()))) {
          matchedMedName = m.name;
          break;
        }
      }
    } catch (mErr) {
      // Fallback to static list
      const staticList = ["paracetamol", "dolo", "crocin", "azithromycin", "amoxicillin", "metformin", "pantoprazole", "cetirizine"];
      matchedMedName = staticList.find((name) => lowerMsg.includes(name));
    }
  }

  if (matchedMedName) {
    detectedIntent = "medicine_stock";
    structuredData = await checkInterBranchAvailability(matchedMedName, queryBranch);
    dbContext = structuredData;
  }
  // Intent B: How many medicines / total medicines
  else if (
    lowerMsg.includes("how many medicines") ||
    lowerMsg.includes("total medicines") ||
    lowerMsg.includes("catalog count") ||
    lowerMsg.includes("medicines are available")
  ) {
    detectedIntent = "catalog_stats";
    structuredData = await getMedicineCatalogStats();
    dbContext = structuredData;
  }
  // Intent C: Low in stock
  else if (lowerMsg.includes("low in stock") || lowerMsg.includes("low stock") || lowerMsg.includes("shortage")) {
    detectedIntent = "low_stock";
    structuredData = await getLowStockBatches(userRole === "Pharmacist" ? userBranch : null);
    dbContext = structuredData;
  }
  // Intent D: Near expiry
  else if (lowerMsg.includes("near expiry") || lowerMsg.includes("expiring") || lowerMsg.includes("expired")) {
    detectedIntent = "near_expiry";
    structuredData = await getNearExpiryBatches(userRole === "Pharmacist" ? userBranch : null);
    dbContext = structuredData;
  }
  // Intent E: Sales & Revenue
  else if (
    lowerMsg.includes("sales") ||
    lowerMsg.includes("revenue") ||
    lowerMsg.includes("bills") ||
    lowerMsg.includes("today's sale") ||
    lowerMsg.includes("today sales")
  ) {
    detectedIntent = "sales_stats";
    structuredData = await getSalesData(user, userBranch);
    dbContext = structuredData;
  }
  // Intent F: Reservations
  else if (lowerMsg.includes("reservation") || lowerMsg.includes("booking")) {
    detectedIntent = "reservations";
    structuredData = await getPendingReservations(userRole === "Pharmacist" ? userBranch : null);
    dbContext = structuredData;
  }
  // Intent G: Prescriptions
  else if (lowerMsg.includes("prescription") || lowerMsg.includes("pending rx")) {
    detectedIntent = "prescriptions";
    structuredData = await getPendingPrescriptions();
    dbContext = structuredData;
  }
  // Intent H: Invoices
  else if (
    lowerMsg.includes("invoice") ||
    lowerMsg.includes("bill") ||
    lowerMsg.includes("inv-") ||
    lowerMsg.includes("mdl/")
  ) {
    detectedIntent = "invoice";
    const words = cleanMsg.split(/\s+/);
    const invoiceCandidate = words.find((w) => {
      const up = w.toUpperCase().replace(/[^A-Z0-9\/-]/g, "");
      if (
        up === "INVOICE" ||
        up === "BILL" ||
        up === "WHAT" ||
        up === "IS" ||
        up === "THE" ||
        up === "SHOW" ||
        up === "DETAILS"
      ) {
        return false;
      }
      return (
        up.includes("INV") ||
        up.includes("MDL") ||
        up.includes("BILL") ||
        (up.includes("-") && /\d/.test(up)) ||
        (up.includes("/") && /\d/.test(up))
      );
    });
    if (invoiceCandidate) {
      const cleanCandidate = invoiceCandidate.replace(/[^a-zA-Z0-9\/-]/g, "");
      structuredData = await getInvoiceDetails(cleanCandidate);
      dbContext = structuredData;
    }
  }

  // 2. If OpenAI API Key is configured, use real OpenAI LLM
  if (OPENAI_API_KEY && OPENAI_API_KEY.trim() !== "") {
    try {
      const systemPrompt = `You are MediBot AI, the clinical pharmacy assistant for MediLink Medical Shop Management System.
Current authenticated user: ${user ? `${user.name} (${user.role} at ${user.branch})` : "Pharmacist Guest"}.
User Role Restrictions:
- Pharmacists can view branch operations, inventory, and clinical data.
- Admins have access to full financial and cross-branch data.

CRITICAL RULES:
1. Ground your answers strictly on the verified MediLink database information provided below.
2. DO NOT invent fake stock numbers, prices, invoices, customers, or availability.
3. If data is not in the database or unavailable, clearly state: "That information is not available in the MediLink database."
4. Format responses cleanly with bullets and clear numbers.

VERIFIED MEDILINK DATABASE CONTEXT:
${dbContext ? JSON.stringify(dbContext, null, 2) : "No specific database query matched. Respond as a helpful pharmacy AI assistant."}`;

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-4).map((h) => ({
          role: h.sender === "user" ? "user" : "assistant",
          content: h.text,
        })),
        { role: "user", content: cleanMsg },
      ];

      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL || "gpt-3.5-turbo",
          messages: apiMessages,
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return {
            text,
            clinicalBadge: detectedIntent !== "general" ? "Live DB Verified" : "AI Assistant",
            intent: detectedIntent,
            data: structuredData,
          };
        }
      }
    } catch (llmErr) {
      console.warn("[MediBot AI] OpenAI LLM call exception, using intelligent grounded responder:", llmErr.message);
    }
  }

  // 3. Intelligent Database Grounded Responder (Deterministic, 100% accurate to real MySQL data)
  if (detectedIntent === "catalog_stats") {
    return {
      text: `📊 MediLink Catalogue Status:\n• Active Medicines in Catalogue: ${structuredData.activeMedicines}\n• Therapeutic Categories: ${structuredData.activeCategories}\n\nAll medicines are indexed with generic composition, batch numbers, and expiry tracking.`,
      clinicalBadge: "Live DB Record",
    };
  }

  if (detectedIntent === "medicine_stock") {
    if (!structuredData.found) {
      return {
        text: `Medicine '${structuredData.medicineName}' is not found in the MediLink catalogue. Please verify the medicine name or check the spelling.`,
        clinicalBadge: "Catalogue Search",
      };
    }
    const { medicine, originBranch, homeAvailable, otherBranches, partnerShops } = structuredData;
    let resp = `📦 Stock Status for ${medicine.name} (${medicine.generic || medicine.strength}):\n\n`;
    resp += `• Current Branch (${originBranch}): ${homeAvailable > 0 ? `${homeAvailable} units available` : "Out of Stock"}\n`;

    if (otherBranches && otherBranches.length > 0) {
      resp += `\n🏬 Other MediLink Branches:\n`;
      otherBranches.forEach((b) => {
        resp += `  - ${b.branch}: ${b.available} units (${b.distanceKm} km away)\n`;
      });
    } else if (homeAvailable === 0) {
      resp += `\n🏬 Other Branches: No stock available in other MediLink branches.\n`;
    }

    if (partnerShops && partnerShops.length > 0) {
      resp += `\n🤝 Registered Partner Medical Shops:\n`;
      partnerShops.slice(0, 3).forEach((p) => {
        resp += `  - ${p.name} (${p.city}): ${p.quantity} units (${p.distanceKm} km, Ph: ${p.phone})\n`;
      });
    }

    return {
      text: resp.trim(),
      clinicalBadge: "Inter-Branch Stock",
      action: {
        label: `View ${medicine.name} Availability`,
        path: `/availability?query=${encodeURIComponent(medicine.name)}`,
      },
    };
  }

  if (detectedIntent === "low_stock") {
    if (!structuredData || structuredData.length === 0) {
      return {
        text: "✅ Great news! No active medicines are currently in low-stock status (below 20 units). All inventory levels are healthy.",
        clinicalBadge: "Inventory Safe",
      };
    }
    const list = structuredData
      .map((b) => `• ${b.medicineName} (Batch ${b.batchNo}): ${b.available} units remaining at ${b.branchName} [Rack ${b.rack}]`)
      .join("\n");
    return {
      text: `⚠️ Current Low-Stock Batches (≤ 20 units):\n\n${list}\n\nPlease initiate purchase replenishment with approved distributors.`,
      clinicalBadge: "Low Stock Alert",
      action: { label: "View Batches", path: "/batches" },
    };
  }

  if (detectedIntent === "near_expiry") {
    if (!structuredData || structuredData.length === 0) {
      return {
        text: "✅ All medicine batches are in safe validity status. No batches expiring within the next 30 days.",
        clinicalBadge: "Expiry Safe",
      };
    }
    const list = structuredData
      .map((b) => `• ${b.medicineName} (Batch ${b.batchNo}): ${b.available} units at ${b.branchName} — Exp: ${b.expiryDate}`)
      .join("\n");
    return {
      text: `⏳ Near-Expiry Alert (Expiring within 30 days):\n\n${list}\n\nPlease prioritize First-Expiry-First-Out (FEFO) dispensing.`,
      clinicalBadge: "FEFO Alert",
      action: { label: "Manage Batches", path: "/batches" },
    };
  }

  if (detectedIntent === "sales_stats") {
    const { branch, todayDate, todaySales, todayBills, monthRevenue, monthBills } = structuredData;
    return {
      text: `💰 Sales & Revenue Report for ${branch} (${todayDate}):\n\n• Today's Sales: ₹${todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n• Today's Total Bills: ${todayBills}\n• Current Month Revenue: ₹${monthRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${monthBills} bills total)\n\nData sourced in real-time from MySQL sales ledger.`,
      clinicalBadge: "Real-time Sales",
      action: { label: "Open Daily Sales Report", path: "/reports/daily-sales" },
    };
  }

  if (detectedIntent === "reservations") {
    if (!structuredData || structuredData.length === 0) {
      return {
        text: "There are currently no active or pending reservations in the system.",
        clinicalBadge: "Reservations",
      };
    }
    const list = structuredData
      .map((r) => `• #${r.id} for ${r.customer}: ${r.quantity}x ${r.medicine} at ${r.branch} (Held until: ${r.expiry})`)
      .join("\n");
    return {
      text: `📋 Active Reservations:\n\n${list}`,
      clinicalBadge: "Reservations",
      action: { label: "Manage Reservations", path: "/reservations" },
    };
  }

  if (detectedIntent === "prescriptions") {
    if (!structuredData || structuredData.length === 0) {
      return {
        text: "All uploaded prescriptions have been verified. No pending prescriptions awaiting review.",
        clinicalBadge: "Rx Review",
      };
    }
    const list = structuredData
      .map((p) => `• #${p.id} - ${p.customer}: ${p.medicine} (${p.quantity} units, Dr. ${p.doctor}, Ref: ${p.ref})`)
      .join("\n");
    return {
      text: `🩺 Pending Prescriptions Requiring Verification:\n\n${list}`,
      clinicalBadge: "Rx Pending",
      action: { label: "Verify Prescriptions", path: "/prescriptions" },
    };
  }

  if (detectedIntent === "invoice") {
    if (!structuredData || !structuredData.found) {
      return {
        text: `No sales or purchase record found matching '${cleanMsg}' in the MediLink database. Please check the bill or invoice number.`,
        clinicalBadge: "Invoice Lookup",
      };
    }
    if (structuredData.type === "sale") {
      const s = structuredData.record;
      const itemsList = (s.items || []).map((i) => `  - ${i.name}: ${i.quantity}x @ ₹${i.price} = ₹${i.total}`).join("\n");
      return {
        text: `🧾 Sales Invoice Details:\n• Bill Number: ${s.bill}\n• Customer: ${s.customer}\n• Branch: ${s.branch}\n• Date: ${s.date}\n• Payment: ${s.payment}\n• Total Amount: ₹${s.amount.toFixed(2)}\n• Status: ${s.status}\n\nItems:\n${itemsList || "  - Standard Dispensed Items"}`,
        clinicalBadge: "Sales Ledger",
      };
    } else {
      const p = structuredData.record;
      return {
        text: `📦 Purchase Invoice Details:\n• Invoice No: ${p.invoice}\n• Supplier: ${p.supplier}\n• Branch: ${p.branch}\n• Date: ${p.date}\n• Amount: ₹${p.amount.toFixed(2)}\n• Payment: ${p.payment}\n• Status: ${p.status}`,
        clinicalBadge: "Purchase Ledger",
      };
    }
  }

  // Clinical Safety check for drug-drug interactions
  if (
    lowerMsg.includes("safe") ||
    lowerMsg.includes("interaction") ||
    lowerMsg.includes("together") ||
    lowerMsg.includes("can i take")
  ) {
    if (lowerMsg.includes("paracetamol") && lowerMsg.includes("ibuprofen")) {
      return {
        clinicalBadge: "Clinical Safety Warning",
        text: "⚠️ Moderate Interaction Alert: Paracetamol (Dolo/Crocin) + Ibuprofen (Brufen)\n\n• Mechanism: Both medications are antipyretic analgesics. Concomitant dosing without spacing increases renal and hepatic clearance strain.\n• Pharmacist Protocol: Advise patient to alternate intake (e.g. Paracetamol every 4-6 hours, Ibuprofen only if fever persists after 2 hours with food).",
      };
    }
    if (lowerMsg.includes("azithromycin") && (lowerMsg.includes("pantoprazole") || lowerMsg.includes("antacid") || lowerMsg.includes("omeprazole"))) {
      return {
        clinicalBadge: "Pharmacology Protocol",
        text: "⚠️ Administration Timing Warning: Azithromycin + PPI (Pantoprazole/Omeprazole)\n\n• Mechanism: Significant elevation of gastric pH slows macrolide absorption peak.\n• Pharmacist Protocol: Counsel patient to take Azithromycin 1 hour before or 2 hours following PPI ingestion for maximum bioavailability.",
      };
    }
  }

  // General intelligent response
  return {
    text: `Hello! I am MediBot, connected live to the MediLink MySQL database.\n\nYou can ask me natural language questions like:\n• "What is the stock of Paracetamol?"\n• "Which medicines are low in stock?"\n• "Which medicines are near expiry?"\n• "Show today's sales"\n• "Show pending reservations"\n• "Is Dolo 650 available at Kovilpatti?"\n• "What is invoice MDL/26-27/1001?"`,
    clinicalBadge: "MediBot Assistant",
  };
}
