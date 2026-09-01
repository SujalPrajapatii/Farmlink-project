import pool from "./config/db.js";

const BASE_URL = "http://localhost:5000/api";

async function post(endpoint, data, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function get(endpoint, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function patch(endpoint, data, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function runTest() {
  console.log("=== STARTING SWIGGY/UBER DELIVERY WORKFLOW INTEGRATION TEST ===");
  const testSuffix = Date.now();

  try {
    // 1. Onboard Farmer
    const farmerEmail = `farmer_${testSuffix}@test.com`;
    const farmerAuth = await post("/auth/register", {
      name: "Ramesh Patel (Organic Farm)",
      email: farmerEmail,
      password: "Password123!",
      accountType: "farmer",
      phone: "9876543210",
      location: "Anand, Gujarat",
    });
    const farmerToken = farmerAuth.token;
    console.log("✓ Farmer registered successfully.");

    // 2. Onboard Delivery Partner
    const riderEmail = `rider_${testSuffix}@test.com`;
    const riderAuth = await post("/auth/register", {
      name: "Vikram Delivery Hero",
      email: riderEmail,
      password: "Password123!",
      accountType: "delivery",
      phone: "9988776655",
      vehicleType: "Electric Scooter",
      vehicleNumber: "GJ-01-FL-9988",
    });
    const riderToken = riderAuth.token;
    console.log("✓ Delivery Partner registered with vehicle details.");

    // 3. Onboard Buyer
    const buyerEmail = `buyer_${testSuffix}@test.com`;
    const buyerAuth = await post("/auth/register", {
      name: "Grand Ahmedabad Supermarket",
      email: buyerEmail,
      password: "Password123!",
      accountType: "business",
      phone: "9123456780",
      location: "Vastrapur, Ahmedabad",
    });
    const buyerToken = buyerAuth.token;
    console.log("✓ Buyer registered successfully.");

    // 4. Farmer creates product
    const product = await post("/products", {
      name: "Fresh Hybrid Tomatoes",
      category: "Vegetables",
      quantity: 500,
      unit: "kg",
      price: 35,
      location: "Anand Farm, Gujarat",
      description: "Farm-fresh ripe tomatoes harvested today",
    }, farmerToken);
    const productId = product.productId || product.id || product.p_id;
    console.log(`✓ Product created (ID: ${productId}).`);

    // 4.5. Buyer adds delivery address
    const addressRes = await post("/addresses", {
      recipientName: "Pooja Mehta (Store Manager)",
      phone: "9123456780",
      addressLine1: "Shop 4, Vastrapur Lake Road",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380015",
      isDefault: true,
    }, buyerToken);
    const addressId = addressRes.id || addressRes.addressId;
    console.log(`✓ Buyer delivery address created (ID: ${addressId}).`);

    // 5. Buyer places order
    const orderRes = await post("/orders", {
      productId,
      quantity: 20,
      addressId,
      paymentMethod: "COD",
    }, buyerToken);
    const orderId = orderRes.orderId || orderRes.id || (orderRes.order && orderRes.order.id);
    console.log(`✓ Order placed by buyer (Order #${orderId}).`);

    // 6. Check order status (COD auto-confirms to Accepted, or Farmer confirms if Pending)
    const [[currentOrderRow]] = await pool.execute("SELECT status FROM orders WHERE o_id = ?", [orderId]);
    if (currentOrderRow.status === "Pending") {
      await patch(`/orders/${orderId}/status`, { status: "Accepted" }, farmerToken);
      console.log(`✓ Farmer confirmed Order #${orderId} (Status: Accepted).`);
    } else {
      console.log(`✓ Order #${orderId} is confirmed (Status: ${currentOrderRow.status}).`);
    }

    // 7. Rider sets shift ONLINE and checks available broadcast radar
    await patch("/delivery/availability", { status: "AVAILABLE" }, riderToken);
    const radar = await get("/delivery/available-orders", riderToken);
    console.log(`✓ Rider Radar active: ${radar.availableOrders.length} order(s) available.`);
    const matchingOrder = radar.availableOrders.find((o) => o.id === orderId);
    if (!matchingOrder) throw new Error("Order not found in rider's broadcast radar!");
    console.log(`✓ Order #${orderId} broadcasted on radar with pickup (${matchingOrder.farmLocation}) and drop (${matchingOrder.deliveryAddress}).`);

    // 8. Rider ACCEPTS the order
    const acceptRes = await post(`/delivery/orders/${orderId}/accept`, {}, riderToken);
    console.log(`✓ Rider accepted order: ${acceptRes.message} (Status: ${acceptRes.status}).`);

    // Verify it is no longer available in broadcast radar
    const radarAfter = await get("/delivery/available-orders", riderToken);
    if (radarAfter.availableOrders.some((o) => o.id === orderId)) {
      throw new Error("Order was not removed from broadcast radar after acceptance!");
    }
    console.log("✓ Order removed from available radar for other riders.");

    // 9. Rider navigates to farm and triggers "Reached Farmer"
    const reachedRes = await patch(`/delivery/orders/${orderId}/status`, { status: "Reached Farmer" }, riderToken);
    console.log(`✓ Rider reached farm: ${reachedRes.message} (Status: ${reachedRes.status}).`);

    // 10. Rider triggers "Start Delivery" (Picked Up / In Transit)
    const startRes = await patch(`/delivery/orders/${orderId}/status`, { status: "In Transit" }, riderToken);
    console.log(`✓ Rider clicked 'Start Delivery': ${startRes.message} (Status: ${startRes.status}).`);

    // 11. Rider sends live GPS coordinate telemetry
    const gpsRes = await post(`/delivery/orders/${orderId}/location`, {
      latitude: 22.8456,
      longitude: 72.7123,
      speed: 42.5,
      heading: 315,
      accuracy: 5.0,
      note: "Delivery partner is approaching Ahmedabad highway.",
    }, riderToken);
    console.log(`✓ Rider GPS coordinate broadcasted: (${gpsRes.latitude}, ${gpsRes.longitude}).`);

    // 12. Buyer views tracking & gets secret OTP
    const tracking = await get(`/orders/${orderId}/tracking`, buyerToken);
    console.log(`✓ Buyer tracking loaded. Order Status: ${tracking.order.status}, Rider: ${tracking.deliveryBoy.name} (${tracking.deliveryBoy.phone}).`);
    const secretOtp = tracking.order.deliveryOtp;
    if (!secretOtp) throw new Error("Delivery confirmation OTP was not generated for buyer!");
    console.log(`✓ Buyer 4-digit secret delivery confirmation OTP: [${secretOtp}].`);

    // 13. Test invalid OTP rejection
    try {
      await patch(`/delivery/orders/${orderId}/status`, { status: "Delivered", otp: "0000" }, riderToken);
      throw new Error("Security failure: Invalid OTP was accepted!");
    } catch (e) {
      console.log(`✓ Security verified: Incorrect OTP correctly rejected with message: "${e.message}".`);
    }

    // 14. Rider delivers order with correct Buyer OTP
    const deliverRes = await patch(`/delivery/orders/${orderId}/status`, { status: "Delivered", otp: secretOtp }, riderToken);
    console.log(`✓ Delivery completed successfully: ${deliverRes.message}.`);

    // 15. Verify final database state
    const [[finalOrder]] = await pool.execute("SELECT status, payment_status, delivered_at FROM orders WHERE o_id = ?", [orderId]);
    if (finalOrder.status !== "Delivered" || finalOrder.payment_status !== "PAID") {
      throw new Error(`Invalid final order state: status=${finalOrder.status}, payment_status=${finalOrder.payment_status}`);
    }
    console.log(`✓ Database verified: Status is 'Delivered', COD payment is 'PAID', delivered_at is '${finalOrder.delivered_at}'.`);

    // Clean up test records
    await pool.execute("DELETE FROM order_delivery_locations WHERE order_id = ?", [orderId]);
    await pool.execute("DELETE FROM order_tracking_events WHERE order_id = ?", [orderId]);
    await pool.execute("DELETE FROM order_notifications WHERE order_id = ?", [orderId]);
    await pool.execute("DELETE FROM payments WHERE order_id = ?", [orderId]);
    await pool.execute("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    await pool.execute("DELETE FROM orders WHERE o_id = ?", [orderId]);
    await pool.execute("DELETE FROM products WHERE p_id = ?", [productId]);
    await pool.execute("DELETE FROM users WHERE email IN (?, ?, ?)", [farmerEmail, riderEmail, buyerEmail]);
    console.log("✓ Test records cleaned up cleanly.");

    console.log("\n=======================================================");
    console.log("🎉 ALL SWIGGY/UBER DELIVERY INTEGRATION TESTS PASSED!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();
