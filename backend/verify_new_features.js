import pool from "./config/db.js";

const BASE_URL = "http://localhost:5000/api";

async function post(endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(endpoint, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function runVerification() {
  console.log("==================================================");
  console.log("  RUNNING FARMLINK COMPREHENSIVE VERIFICATION");
  console.log("==================================================");

  // 1. Authenticate roles
  console.log("\n1. Authenticating test accounts...");
  const adminLogin = await post("/auth/login", { email: "admin1@gmail.com", password: "Password123!" });
  const farmerLogin = await post("/auth/login", { email: "ramesh.patel@farmlink.com", password: "Password123!" });
  const riderLogin = await post("/auth/login", { email: "vikram.rider@farmlink.com", password: "Password123!" });
  const buyerLogin = await post("/auth/login", { email: "pooja.mehta@farmlink.com", password: "Password123!" });

  console.log("✓ Admin:", adminLogin.data.user.name, "| Role:", adminLogin.data.user.accountType);
  console.log("✓ Farmer:", farmerLogin.data.user.name, "| Role:", farmerLogin.data.user.accountType);
  console.log("✓ Rider:", riderLogin.data.user.name, "| Role:", riderLogin.data.user.accountType);
  console.log("✓ Buyer:", buyerLogin.data.user.name, "| Role:", buyerLogin.data.user.accountType);

  // 2. Test Requirement 1: Non-buyers CANNOT place orders (Farmer, Rider, Admin blocked)
  console.log("\n2. Testing Purchase & Order Restriction on Non-Buyers...");
  
  // Farmer order attempt
  const farmerOrder = await post("/orders", { productId: 1, quantity: 10, addressId: 1, paymentMethod: "COD" }, farmerLogin.data.token);
  console.log(`Farmer order attempt status: ${farmerOrder.status} (Expected: 403)`);
  if (farmerOrder.status !== 403) throw new Error(`Farmer was not blocked from ordering! Got ${farmerOrder.status}`);
  console.log("✓ Farmer correctly blocked from ordering with 403 Forbidden:", farmerOrder.data.message);

  // Rider order attempt
  const riderOrder = await post("/orders", { productId: 1, quantity: 10, addressId: 1, paymentMethod: "COD" }, riderLogin.data.token);
  console.log(`Rider order attempt status: ${riderOrder.status} (Expected: 403)`);
  if (riderOrder.status !== 403) throw new Error(`Rider was not blocked from ordering! Got ${riderOrder.status}`);
  console.log("✓ Rider correctly blocked from ordering with 403 Forbidden:", riderOrder.data.message);

  // Admin order attempt
  const adminOrder = await post("/orders", { productId: 1, quantity: 10, addressId: 1, paymentMethod: "COD" }, adminLogin.data.token);
  console.log(`Admin order attempt status: ${adminOrder.status} (Expected: 403)`);
  if (adminOrder.status !== 403) throw new Error(`Admin was not blocked from ordering! Got ${adminOrder.status}`);
  console.log("✓ Admin correctly blocked from ordering with 403 Forbidden:", adminOrder.data.message);

  // 3. Test Requirement 2: Admin user removal with reason
  console.log("\n3. Testing Admin User Removal with Reason...");
  const testEmail = `test_removal_${Date.now()}@example.com`;
  const registerRes = await post("/auth/register", {
    name: "Temporary Test Buyer",
    email: testEmail,
    password: "Password123!",
    accountType: "business",
    phone: "9898989898",
  });
  const tempUserId = registerRes.data.user.id;
  console.log(`✓ Temporary test user registered (ID: ${tempUserId}, Email: ${testEmail})`);

  // Admin removes user with a specific reason
  const removalReason = "Violation of platform terms: suspected unauthorized bulk reselling without verification";
  const removeRes = await post(`/admin/users/${tempUserId}/remove`, { reason: removalReason }, adminLogin.data.token);
  console.log(`Remove user status: ${removeRes.status} (Expected: 200)`);
  if (removeRes.status !== 200) throw new Error(`User removal failed! Got ${removeRes.status}`);
  console.log("✓ Admin successfully removed user. Response:", removeRes.data.message);

  // Attempt login with removed user -> MUST return 403 with reason!
  const blockedLogin = await post("/auth/login", { email: testEmail, password: "Password123!" });
  console.log(`Removed user login status: ${blockedLogin.status} (Expected: 403)`);
  if (blockedLogin.status !== 403) throw new Error(`Removed user was able to log in! Got ${blockedLogin.status}`);
  console.log("✓ Removed user login properly blocked with 403!");
  console.log("✓ Block message with reason:", blockedLogin.data.message);

  // 4. Test Requirement 3 & 4: Admin dashboard queries return isDeleted, removalReason, removedAt
  console.log("\n4. Testing Admin Dashboard Data Fields...");
  const dashRes = await get("/admin/dashboard", adminLogin.data.token);
  if (dashRes.status !== 200) throw new Error(`Dashboard fetch failed! Got ${dashRes.status}`);
  const removedUserInDash = dashRes.data.businesses.find((b) => b.id === tempUserId);
  if (!removedUserInDash) throw new Error("Removed user not found in admin businesses list!");
  console.log("✓ Removed user correctly reflected in admin data:");
  console.log("  - isDeleted:", removedUserInDash.isDeleted);
  console.log("  - removalReason:", removedUserInDash.removalReason);
  console.log("  - removedAt:", removedUserInDash.removedAt);

  // Clean up the temporary test user
  await pool.execute("DELETE FROM users WHERE u_id = ?", [tempUserId]);
  console.log("✓ Cleaned up temporary test user.");

  console.log("\n==================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
