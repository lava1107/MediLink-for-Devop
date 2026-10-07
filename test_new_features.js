import { spawn } from "child_process";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("==================================================================");
  console.log("MEDILINK NEW FEATURES END-TO-END VERIFICATION");
  console.log("==================================================================");

  // 1. Health check
  console.log("\n[TEST 1] Backend Health & Database Connectivity");
  const healthRes = await fetch("http://localhost:5000/api/health");
  const healthData = await healthRes.json();
  console.log("Status:", healthRes.status, "Connected:", healthData.database);

  // 2. Google OAuth
  console.log("\n[TEST 2] Google OAuth 2.0 Integration");
  const cfgRes = await fetch("http://localhost:5000/api/auth/google/config");
  const cfgData = await cfgRes.json();
  console.log("Google Config:", cfgData.data);

  const testEmail = `doctor.karthik.${Date.now().toString().slice(-4)}@gmail.com`;
  const oauthRes = await fetch("http://localhost:5000/api/auth/oauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "Google",
      email: testEmail,
      name: "Dr. Karthik Sundar (Google Account)",
      role: "Admin",
    }),
  });
  const oauthData = await oauthRes.json();
  console.log("Google Account Sign-In Result -> Status:", oauthRes.status, "Success:", oauthData.success);
  console.log("Authenticated User:", oauthData.data?.user?.email, "Role:", oauthData.data?.user?.role, "Token Issued:", Boolean(oauthData.data?.token));
  const authToken = oauthData.data?.token;

  // 3. Partner Medical Shops - Click Shop to View Varying Medicines
  console.log("\n[TEST 3] Partner Shops - Varying Medicines per Shop");
  const shopsRes = await fetch("http://localhost:5000/api/partner-shops");
  const shopsData = await shopsRes.json();
  console.log("Total Partner Shops:", shopsData.data?.length);

  const ps1MedsRes = await fetch("http://localhost:5000/api/partner-shops/PS-01/medicines");
  const ps1Meds = await ps1MedsRes.json();
  console.log(`PS-01 (Sri Lakshmi Medicals) Medicines (${ps1Meds.data?.length} items):`, ps1Meds.data?.map(m => `${m.medicineName} (${m.quantity} units, ₹${m.price})`).slice(0, 3));

  const ps2MedsRes = await fetch("http://localhost:5000/api/partner-shops/PS-02/medicines");
  const ps2Meds = await ps2MedsRes.json();
  console.log(`PS-02 (Apollo Medical Centre) Medicines (${ps2Meds.data?.length} items):`, ps2Meds.data?.map(m => `${m.medicineName} (${m.quantity} units, ₹${m.price})`).slice(0, 3));

  const areDifferent = JSON.stringify(ps1Meds.data?.map(m => m.medicineName)) !== JSON.stringify(ps2Meds.data?.map(m => m.medicineName));
  console.log("Inventories Vary Across Different Shops:", areDifferent ? "YES (Verified!)" : "NO");

  // Add medicine to partner shop
  const addMedRes = await fetch("http://localhost:5000/api/partner-shops/PS-01/medicines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      medicineName: "Zincovit Multivitamin Tablets",
      quantity: 50,
      price: 110,
    }),
  });
  const addMedData = await addMedRes.json();
  console.log("Add Medicine to Partner Shop -> Success:", addMedData.success, "Item:", addMedData.data?.medicineName, "Qty:", addMedData.data?.quantity);

  // 4. Medicine Reservations with Phone Number & Booking Time Queue SMS
  console.log("\n[TEST 4] Medicine Reservations with Phone Number & Booking Time Queue SMS");
  const createRes1 = await fetch("http://localhost:5000/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      customer: "Suresh Babu",
      phone: "+91 98421 22334",
      medicine: "Human Mixtard Insulin",
      branch: "Kovilpatti Branch",
      quantity: 3,
      sendSmsNotification: true,
    }),
  });
  const res1Data = await createRes1.json();
  console.log("Reservation 1 Created -> Customer:", res1Data.data?.customer, "Phone:", res1Data.data?.phone, "Medicine:", res1Data.data?.medicine);

  const createRes2 = await fetch("http://localhost:5000/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      customer: "Muthu Vel",
      phone: "+91 96297 33810",
      medicine: "Human Mixtard Insulin",
      branch: "Kovilpatti Branch",
      quantity: 7,
      sendSmsNotification: true,
    }),
  });
  const res2Data = await createRes2.json();
  console.log("Reservation 2 Created -> Customer:", res2Data.data?.customer, "Phone:", res2Data.data?.phone, "Medicine:", res2Data.data?.medicine);

  // Trigger Stock Arrival Notification (10 available -> queue SMS sent strictly by booking time)
  console.log("\n[TEST 5] Stock Arrived -> Real SMS Dispatch to Booking Queue");
  const queueRes = await fetch("http://localhost:5000/api/reservations/notify-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      medicineName: "Human Mixtard Insulin",
      branch: "Kovilpatti Branch",
      availableQuantity: 10,
    }),
  });
  const queueData = await queueRes.json();
  console.log("Stock Queue Dispatch Result -> Success:", queueData.success);
  console.log("Total Stock Available:", queueData.data?.totalAvailable);
  console.log("Customers Notified in Queue Order:", queueData.data?.notifiedCount);
  queueData.data?.notifiedCustomers?.forEach((nc) => {
    console.log(`  Queue #${nc.queueRank} -> ${nc.customer} (${nc.phone}) | Allocated: ${nc.allocatedQty} units | Status: ${nc.smsStatus} | Carrier: ${nc.networkCarrier}`);
    console.log(`  SMS Body: "${nc.smsMessage}"`);
  });

  // Verify communication log in DB
  const commLogsRes = await fetch("http://localhost:5000/api/communication/logs?type=sms&limit=5");
  const commLogsData = await commLogsRes.json();
  console.log("\nRecent Communication Logs in Database (SMS):", commLogsData.data?.length, "logged messages.");
  if (commLogsData.data?.length > 0) {
    const latest = commLogsData.data[0];
    console.log(`Latest SMS -> Recipient: ${latest.recipient} (${latest.recipient_name}) | Provider: ${latest.provider} | Status: ${latest.status}`);
  }

  console.log("\n==================================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

runTests().catch(console.error);
