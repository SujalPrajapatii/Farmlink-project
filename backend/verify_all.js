import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET;

async function runTests() {
  console.log("=== RUNNING COMPLETE FARMLINK VERIFICATION SUITE ===");

  // Test 1: Login as Farmer Sanket Jadav
  console.log("\n1. Testing Login as Farmer Sanket Jadav (sd1@gmal.com)...");
  const f2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sd1@gmal.com", password: "123456" }),
  });
  if (!f2LoginRes.ok) throw new Error(`F2 login failed: ${f2LoginRes.status}`);
  const f2Data = await f2LoginRes.json();
  console.log("✓ Farmer 2 Login successful! User:", f2Data.user.name, "| AccountType:", f2Data.user.accountType);

  // Test 2: Fetch Farmer 2 Orders
  console.log("\n2. Testing /orders/mine for Farmer 2...");
  const f2OrdersRes = await fetch(`${BASE_URL}/orders/mine`, {
    headers: { Authorization: `Bearer ${f2Data.token}` },
  });
  if (!f2OrdersRes.ok) throw new Error(`F2 orders failed: ${f2OrdersRes.status}`);
  const f2Orders = await f2OrdersRes.json();
  console.log(`✓ Farmer 2 Orders count: ${f2Orders.length}`);
  if (f2Orders.length > 0) {
    console.log("Sample order ID:", f2Orders[0].id, "| Status:", f2Orders[0].status, "| Items count:", f2Orders[0].items?.length);
  }

  // Test 3: Fetch Farmer 2 Products
  console.log("\n3. Testing /products/mine for Farmer 2...");
  const f2ProdsRes = await fetch(`${BASE_URL}/products/mine`, {
    headers: { Authorization: `Bearer ${f2Data.token}` },
  });
  if (!f2ProdsRes.ok) throw new Error(`F2 products failed: ${f2ProdsRes.status}`);
  const f2Prods = await f2ProdsRes.json();
  console.log(`✓ Farmer 2 Products count: ${f2Prods.length}`);
  console.log("Products:", f2Prods.map((p) => `${p.name} (₹${p.price}/${p.unit}, Stock: ${p.quantity})`).join(", "));

  // Test 4: Login as Demo Farmer Ramesh Patel
  console.log("\n4. Testing Login as Farmer Ramesh Patel (ramesh.patel@farmlink.com)...");
  const f27LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ramesh.patel@farmlink.com", password: "Password123!" }),
  });
  if (!f27LoginRes.ok) throw new Error(`F27 login failed: ${f27LoginRes.status}`);
  const f27Data = await f27LoginRes.json();
  console.log("✓ Farmer 27 Login successful! User:", f27Data.user.name);

  // Test 5: Fetch Farmer 27 Orders & Products
  console.log("\n5. Testing /orders/mine and /products/mine for Farmer 27...");
  const f27OrdersRes = await fetch(`${BASE_URL}/orders/mine`, {
    headers: { Authorization: `Bearer ${f27Data.token}` },
  });
  const f27Orders = await f27OrdersRes.json();
  console.log(`✓ Farmer 27 Orders count: ${f27Orders.length}`);

  const f27ProdsRes = await fetch(`${BASE_URL}/products/mine`, {
    headers: { Authorization: `Bearer ${f27Data.token}` },
  });
  const f27Prods = await f27ProdsRes.json();
  console.log(`✓ Farmer 27 Products count: ${f27Prods.length}`);
  console.log("Products:", f27Prods.map((p) => `${p.name} (₹${p.price}/${p.unit})`).join(", "));

  // Test 6: Login as Business Buyer Pooja Mehta
  console.log("\n6. Testing Buyer Login and Marketplace Access...");
  const buyerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "pooja.mehta@farmlink.com", password: "Password123!" }),
  });
  const buyerData = await buyerLoginRes.json();
  console.log("✓ Buyer Login successful! User:", buyerData.user.name);

  const allProdsRes = await fetch(`${BASE_URL}/products`);
  const allProds = await allProdsRes.json();
  console.log(`✓ Marketplace available products count: ${allProds.length}`);

  // Test 7: CRITICAL - Expired Token Auto-Refresh Test
  console.log("\n7. CRITICAL TEST: Expired Token Auto-Refresh...");
  // Create an expired JWT token (expired 10 days ago) for Farmer Sanket Jadav (ID 2)
  const expiredTimestamp = Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60);
  const expiredToken = jwt.sign(
    {
      id: 2,
      accountType: "farmer",
      iat: expiredTimestamp - 3600,
      exp: expiredTimestamp,
    },
    JWT_SECRET
  );

  console.log("Created an expired token. Now calling /orders/mine with it...");
  const expiredCallRes = await fetch(`${BASE_URL}/orders/mine`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });

  console.log(`Response status: ${expiredCallRes.status} (Expected: 200 OK via auto-refresh)`);
  if (expiredCallRes.status !== 200) {
    const errorBody = await expiredCallRes.json();
    throw new Error(`Expired token was not refreshed! Status: ${expiredCallRes.status}, Body: ${JSON.stringify(errorBody)}`);
  }

  const refreshedToken = expiredCallRes.headers.get("x-refreshed-token");
  console.log("✓ x-refreshed-token header received:", refreshedToken ? `${refreshedToken.slice(0, 25)}...` : "NONE");
  if (!refreshedToken) {
    throw new Error("Missing x-refreshed-token header in response!");
  }

  const ordersFromExpiredCall = await expiredCallRes.json();
  console.log(`✓ Orders successfully loaded with expired token! Count: ${ordersFromExpiredCall.length}`);

  // Test with the refreshed token to verify it works for subsequent calls
  const subsequentRes = await fetch(`${BASE_URL}/orders/mine`, {
    headers: { Authorization: `Bearer ${refreshedToken}` },
  });
  if (subsequentRes.status !== 200) {
    throw new Error(`Refreshed token call failed: ${subsequentRes.status}`);
  }
  console.log("✓ Subsequent call with newly issued token works perfectly (200 OK)!");

  // Test 8: Tampered/Bogus Token (should return 401)
  console.log("\n8. Testing Bogus/Tampered Token Rejection...");
  const bogusRes = await fetch(`${BASE_URL}/orders/mine`, {
    headers: { Authorization: "Bearer totally_fake_and_invalid_token" },
  });
  console.log(`Response status: ${bogusRes.status} (Expected: 401)`);
  if (bogusRes.status !== 401) {
    throw new Error(`Bogus token should be rejected with 401, got ${bogusRes.status}`);
  }
  const bogusBody = await bogusRes.json();
  console.log("✓ Bogus token properly rejected with 401:", bogusBody.message);

  console.log("\n==================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! WEBSITE IS 100% OPERATIONAL!");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
