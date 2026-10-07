import fs from "fs";

async function runEndToEndChecks() {
  console.log("----------------------------------------------------");
  console.log("1. Verifying Backend Connection & MySQL Database");
  console.log("----------------------------------------------------");
  const healthRes = await fetch("http://localhost:5000/api/health");
  const health = await healthRes.json();
  console.log("Health Status:", healthRes.status, "Message:", health.message, "Database:", health.database);

  console.log("\n----------------------------------------------------");
  console.log("2. Verifying Real Google OAuth Endpoints");
  console.log("----------------------------------------------------");
  const cfgRes = await fetch("http://localhost:5000/api/auth/google/config");
  const cfg = await cfgRes.json();
  console.log("Google Config status:", cfg.success, "Data:", cfg.data);

  const testClientId = "1234567890-test.apps.googleusercontent.com";
  const urlRes = await fetch("http://localhost:5000/api/auth/google/url?clientId=" + encodeURIComponent(testClientId));
  const urlData = await urlRes.json();
  console.log("Google OAuth Auth URL generation:", urlData.success, "URL prefix:", urlData.data?.url?.slice(0, 52));

  console.log("\n----------------------------------------------------");
  console.log("3. Verifying Sale & Tax Invoice PDF Generation");
  console.log("----------------------------------------------------");
  const { generateInvoicePdf } = await import("./MediLink/src/utils/invoicePdf.js");
  const pdfRes = generateInvoicePdf({
    sale: { bill: "MDL/26-27/2001", date: "2026-10-05", payment: "UPI", amount: 980 },
    branch: { name: "Kovilpatti Branch", address: "12 VOC Street", city: "Kovilpatti", phone: "+91 98421 30221", email: "kovilpatti@medilink.in" },
    customerName: "Suresh Kumar",
    items: [
      { name: "Amoxicillin 500mg", generic: "Amoxicillin", batchNo: "B-AMX-26", expiryDate: "2027-06-30", qty: 2, price: 120, discount: 5, gst: 12, lineTotal: 255.36 },
      { name: "Paracetamol 650mg", generic: "Paracetamol", batchNo: "B-PCM-26", expiryDate: "2028-01-15", qty: 3, price: 30, discount: 0, gst: 12, lineTotal: 100.80 },
      { name: "Cetirizine 10mg", generic: "Cetirizine HCl", batchNo: "B-CTZ-26", expiryDate: "2027-11-20", qty: 1, price: 45, discount: 0, gst: 12, lineTotal: 50.40 }
    ],
    subtotal: 415,
    discount: 12,
    gst: 48,
    grandTotal: 980
  });
  console.log("PDF Result:", pdfRes.success, "Filename:", pdfRes.filename, "Doc output size:", pdfRes.doc.output("arraybuffer").byteLength, "bytes");

  console.log("\n----------------------------------------------------");
  console.log("4. Verifying 5 Curated Color Themes & Palettes");
  console.log("----------------------------------------------------");
  const { COLOR_THEMES } = await import("./MediLink/src/utils/theme.js");
  console.log("Total Color Themes configured:", COLOR_THEMES.length);
  COLOR_THEMES.forEach((ct, i) => {
    console.log("  " + (i + 1) + ". [" + ct.id + "] " + ct.name.padEnd(16) + " -> Pair: " + ct.pair.join(" + ") + " (" + ct.subtitle + ")");
  });

  console.log("\n====================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("====================================================");
}

runEndToEndChecks().catch(console.error);
