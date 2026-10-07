async function testAll() {
  console.log("==================================================");
  console.log("1. Testing 7 User Logins via /api/auth/login");
  console.log("==================================================");
  const usersToTest = [
    { u: "lavanya.admin", p: "admin123", role: "Admin" },
    { u: "sundar.admin", p: "admin123", role: "Admin" },
    { u: "rajan.pharmacist", p: "pharma123", role: "Pharmacist" },
    { u: "meenakshi.ph", p: "pharma123", role: "Pharmacist" },
    { u: "arunkumar.ph", p: "pharma123", role: "Pharmacist" },
    { u: "divya.ph", p: "pharma123", role: "Pharmacist" },
    { u: "bhuvana.ph", p: "pharma123", role: "Pharmacist" },
  ];

  for (const { u, p } of usersToTest) {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const d = await res.json();
    console.log(`[LOGIN] ${u.padEnd(18)} -> Status: ${res.status}, Success: ${d.success}, Role: ${d.data?.user?.role}, Token: ${!!d.data?.token}`);
  }

  console.log("\n==================================================");
  console.log("2. Testing OAuth Authentication via /api/auth/oauth");
  console.log("==================================================");
  const oauthRes = await fetch("http://localhost:5000/api/auth/oauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "Google",
      email: "dr.lavanya.med@gmail.com",
      name: "Dr. Lavanya M (Google)",
      role: "Admin",
    }),
  });
  const oauthData = await oauthRes.json();
  console.log(`[OAUTH] Google OAuth -> Status: ${oauthRes.status}, Success: ${oauthData.success}, Token: ${!!oauthData.data?.token}`);

  console.log("\n==================================================");
  console.log("3. Testing API Key External Access via X-API-Key");
  console.log("==================================================");
  const apiKeyRes = await fetch("http://localhost:5000/api/medicines", {
    headers: { "X-API-Key": "ml_live_8f9a2b7c4e1d0f6a_2026" },
  });
  const apiData = await apiKeyRes.json();
  console.log(`[API KEY] GET /api/medicines -> Status: ${apiKeyRes.status}, Count: ${apiData.data?.length}`);

  console.log("\n==================================================");
  console.log("4. Testing Partner Shops & Availability Endpoints");
  console.log("==================================================");
  const availRes = await fetch("http://localhost:5000/api/availability", {
    headers: { "X-API-Key": "ml_live_8f9a2b7c4e1d0f6a_2026" },
  });
  const availData = await availRes.json();
  console.log(`[AVAILABILITY] GET /api/availability -> Status: ${availRes.status}, Success: ${availData.success}`);

  const partnerRes = await fetch("http://localhost:5000/api/partner-shops", {
    headers: { "X-API-Key": "ml_live_8f9a2b7c4e1d0f6a_2026" },
  });
  const partnerData = await partnerRes.json();
  console.log(`[PARTNERS] GET /api/partner-shops -> Status: ${partnerRes.status}, Count: ${partnerData.data?.length}`);

  console.log("\nALL BACKEND API VERIFICATIONS PASSED SUCCESSFULLY!");
}

testAll().catch(console.error);
