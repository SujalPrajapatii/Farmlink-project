import pool from "../config/db.js";

// Returns rider dashboard statistics and profile info
export const getDeliveryDashboard = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Get rider profile details
    const [riders] = await pool.execute(
      `SELECT u_id AS id, name, email, phone,
              vehicle_type AS vehicleType, vehicle_number AS vehicleNumber,
              availability_status AS availabilityStatus,
              current_latitude AS currentLatitude, current_longitude AS currentLongitude,
              last_location_time AS lastLocationTime
       FROM users WHERE u_id = ? AND account_type = 'delivery'`,
      [riderId]
    );

    if (riders.length === 0) {
      return res.status(403).json({ message: "Delivery rider account not found." });
    }
    const rider = riders[0];

    // Active deliveries count (all active in-flight stages)
    const [[activeRow]] = await pool.execute(
      `SELECT COUNT(*) AS activeCount
       FROM orders
       WHERE delivery_boy_id = ?
         AND status IN ('Delivery Boy Assigned', 'Going to Farmer', 'Reached Farmer', 'Picked Up', 'In Transit', 'Out for Delivery')`,
      [riderId]
    );

    // Today delivered count
    const [[todayRow]] = await pool.execute(
      `SELECT COUNT(*) AS todayCount, COALESCE(SUM(total), 0) AS todaySales
       FROM orders
       WHERE delivery_boy_id = ?
         AND status = 'Delivered'
         AND DATE(COALESCE(delivered_at, created_at)) = CURRENT_DATE`,
      [riderId]
    );

    // All time delivered count & total value delivered
    const [[allTimeRow]] = await pool.execute(
      `SELECT COUNT(*) AS totalDelivered, COALESCE(SUM(total), 0) AS totalSalesDelivered
       FROM orders
       WHERE delivery_boy_id = ? AND status = 'Delivered'`,
      [riderId]
    );

    const totalDelivered = Number(allTimeRow.totalDelivered || 0);
    const todayDelivered = Number(todayRow.todayCount || 0);
    // Estimated rider earnings: ₹60 flat incentive per completed delivery + 2% bonus
    const estimatedEarnings = Math.round(totalDelivered * 60 + Number(allTimeRow.totalSalesDelivered || 0) * 0.02);
    const todayEarnings = Math.round(todayDelivered * 60 + Number(todayRow.todaySales || 0) * 0.02);

    res.json({
      rider,
      activeOrdersCount: Number(activeRow.activeCount || 0),
      todayDeliveredCount: todayDelivered,
      totalDeliveredCount: totalDelivered,
      todayEarnings,
      estimatedEarnings,
      availabilityStatus: rider.availabilityStatus || "AVAILABLE",
    });
  } catch (error) {
    console.error("Get delivery dashboard error:", error);
    res.status(500).json({ message: "Could not load delivery dashboard data." });
  }
};

// Swiggy/Uber-style Broadcast Radar: returns available unassigned orders for online delivery riders
export const getAvailableOrders = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Check rider availability
    const [riders] = await pool.execute(
      `SELECT availability_status AS availabilityStatus, current_latitude AS currentLatitude, current_longitude AS currentLongitude
       FROM users WHERE u_id = ? AND account_type = 'delivery'`,
      [riderId]
    );

    if (riders.length === 0) {
      return res.status(403).json({ message: "Delivery rider account not found." });
    }

    const rider = riders[0];
    const isOnline = rider.availabilityStatus === "AVAILABLE";

    if (!isOnline) {
      return res.json({
        isOnline: false,
        message: "You are currently offline. Go online to view and accept incoming delivery orders.",
        availableOrders: [],
      });
    }

    // Fetch unassigned orders that have been confirmed (Accepted or Pending with COD/paid)
    // Exclude orders denied/rejected by this rider in rider_rejected_orders
    const [orders] = await pool.execute(
      `SELECT
         o.o_id AS id,
         o.status,
         o.total,
         o.payment_method AS paymentMethod,
         o.payment_status AS paymentStatus,
         o.tracking_code AS trackingCode,
         o.delivery_name AS deliveryName,
         o.delivery_phone AS deliveryPhone,
         o.delivery_address AS deliveryAddress,
         o.created_at AS createdAt,
         b.name AS buyerName,
         b.email AS buyerEmail,
         b.phone AS buyerPhone
       FROM orders o
       JOIN users b ON b.u_id = o.business_id
       WHERE o.delivery_boy_id IS NULL
         AND o.status IN ('Accepted', 'Pending')
         AND o.o_id NOT IN (
           SELECT order_id FROM rider_rejected_orders WHERE rider_id = ?
         )
       ORDER BY o.created_at DESC LIMIT 20`,
      [riderId]
    );

    if (orders.length === 0) {
      return res.json({
        isOnline: true,
        message: "No unassigned orders available at the moment.",
        availableOrders: [],
      });
    }

    const orderIds = orders.map((o) => o.id);
    const placeholders = orderIds.map(() => "?").join(",");

    const [items] = await pool.execute(
      `SELECT
         oi.oi_id AS id,
         oi.order_id AS orderId,
         oi.product_id AS productId,
         oi.farmer_id AS farmerId,
         oi.quantity,
         oi.unit_price AS unitPrice,
         oi.total,
         p.name AS productName,
         p.category AS productCategory,
         p.unit AS productUnit,
         p.location AS farmLocation,
         p.image_url AS productImage,
         f.name AS farmerName,
         f.phone AS farmerPhone
       FROM order_items oi
       JOIN products p ON oi.product_id = p.p_id
       JOIN users f ON oi.farmer_id = f.u_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.oi_id ASC`,
      orderIds
    );

    const itemsByOrder = new Map();
    for (const item of items) {
      if (!itemsByOrder.has(item.orderId)) {
        itemsByOrder.set(item.orderId, []);
      }
      itemsByOrder.get(item.orderId).push(item);
    }

    const enrichedAvailableOrders = orders.map((order) => {
      const orderItems = itemsByOrder.get(order.id) || [];
      const distinctFarmers = [];
      const seenFarmerIds = new Set();
      for (const item of orderItems) {
        if (!seenFarmerIds.has(item.farmerId)) {
          seenFarmerIds.add(item.farmerId);
          distinctFarmers.push({
            id: item.farmerId,
            name: item.farmerName,
            phone: item.farmerPhone || "",
            farmLocation: item.farmLocation || "Farm Location",
          });
        }
      }

      return {
        ...order,
        items: orderItems,
        farmers: distinctFarmers,
        farmerName: distinctFarmers.map((f) => f.name).join(", ") || "Farmer",
        farmerPhone: distinctFarmers[0]?.phone || "",
        farmLocation: distinctFarmers[0]?.farmLocation || "Gujarat Farm",
        productSummary: orderItems.map((i) => `${i.productName} (${i.quantity} ${i.productUnit})`).join(", "),
      };
    });

    res.json({
      isOnline: true,
      availableOrders: enrichedAvailableOrders,
    });
  } catch (error) {
    console.error("Get available orders error:", error);
    res.status(500).json({ message: "Could not load available orders." });
  }
};

// Rider accepts an available broadcast order exclusively
export const acceptDeliveryOrder = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const riderId = req.user.id;
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // 1. Fetch rider info
    const [riders] = await connection.execute(
      `SELECT u_id AS id, name, phone, vehicle_type AS vehicleType, vehicle_number AS vehicleNumber
       FROM users WHERE u_id = ? AND account_type = 'delivery'`,
      [riderId]
    );
    const rider = riders[0];
    if (!rider) {
      await connection.rollback();
      return res.status(403).json({ message: "Delivery rider account not found." });
    }

    // 2. Lock order row and check availability
    const [orders] = await connection.execute(
      `SELECT o.o_id AS id, o.business_id, o.status, o.delivery_boy_id,
              b.name AS buyerName
       FROM orders o
       JOIN users b ON b.u_id = o.business_id
       WHERE o.o_id = ?
       FOR UPDATE`,
      [orderId]
    );
    const order = orders[0];

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.delivery_boy_id !== null) {
      await connection.rollback();
      return res.status(409).json({
        message: "This order has already been accepted by another delivery partner.",
      });
    }

    if (!["Accepted", "Pending"].includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: `Order cannot be accepted in status '${order.status}'.`,
      });
    }

    // 3. Assign order to rider with status 'Going to Farmer'
    await connection.execute(
      `UPDATE orders
       SET delivery_boy_id = ?,
           status = 'Going to Farmer',
           assigned_at = CURRENT_TIMESTAMP
       WHERE o_id = ?`,
      [riderId, orderId]
    );

    await connection.execute(
      `UPDATE order_items SET status = 'Going to Farmer' WHERE order_id = ?`,
      [orderId]
    );

    // 4. Log timeline event
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, 'Going to Farmer', ?)`,
      [
        orderId,
        `Delivery partner ${rider.name} accepted Order #${orderId} and is navigating to the farm for pickup.`,
      ]
    );

    // 5. Fetch distinct farmers in this order
    const [orderFarmers] = await connection.execute(
      `SELECT DISTINCT oi.farmer_id, f.name AS farmerName, f.phone AS farmerPhone
       FROM order_items oi
       JOIN users f ON f.u_id = oi.farmer_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // 6. Notify Farmer(s) with Rider details
    for (const f of orderFarmers) {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'RIDER_ACCEPTED_FARMER', 'Delivery Partner Heading to Farm', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          f.farmer_id,
          orderId,
          `Delivery partner ${rider.name} (${rider.phone || "No phone"}, ${rider.vehicleType || "Bike"}) has accepted Order #${orderId} and is on the way to your farm for harvest pickup.`,
        ]
      );
    }

    // 7. Notify Buyer
    await connection.execute(
      `INSERT INTO order_notifications (user_id, order_id, type, title, message)
       VALUES (?, ?, 'RIDER_ACCEPTED_BUYER', 'Delivery Partner Assigned', ?)
       ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
      [
        order.business_id,
        orderId,
        `Delivery partner ${rider.name} (${rider.vehicleType || "Bike"}) has accepted Order #${orderId} and is heading to the farm for pickup.`,
      ]
    );

    // 8. Notify Rider
    await connection.execute(
      `INSERT INTO order_notifications (user_id, order_id, type, title, message)
       VALUES (?, ?, 'ORDER_ACCEPTED_RIDER', 'Pickup Accepted', ?)
       ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
      [
        riderId,
        orderId,
        `You accepted Order #${orderId}. Proceed to the farm location for harvest pickup.`,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    res.json({
      message: `Order #${orderId} accepted successfully! You are now assigned to this delivery.`,
      orderId,
      status: "Going to Farmer",
    });
  } catch (error) {
    console.error("Accept delivery order error:", error);
    if (connection && transactionStarted) await connection.rollback();
    res.status(500).json({ message: error.message || "Could not accept order." });
  } finally {
    if (connection) connection.release();
  }
};

// Rider denies/rejects a broadcast order from their radar
export const denyDeliveryOrder = async (req, res) => {
  try {
    const riderId = req.user.id;
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    await pool.execute(
      `INSERT INTO rider_rejected_orders (rider_id, order_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
      [riderId, orderId]
    );

    res.json({ message: `Order #${orderId} dismissed from your available radar.` });
  } catch (error) {
    console.error("Deny delivery order error:", error);
    res.status(500).json({ message: "Could not dismiss order." });
  }
};

// Returns list of assigned orders for this delivery rider
export const getAssignedOrders = async (req, res) => {
  try {
    const riderId = req.user.id;

    // Fetch all orders assigned to this rider
    const [orders] = await pool.execute(
      `SELECT
         o.o_id AS id,
         o.status,
         o.total,
         o.payment_method AS paymentMethod,
         o.payment_status AS paymentStatus,
         o.tracking_code AS trackingCode,
         o.delivery_name AS deliveryName,
         o.delivery_phone AS deliveryPhone,
         o.delivery_address AS deliveryAddress,
         o.delivery_notes AS deliveryNotes,
         o.assigned_at AS assignedAt,
         o.reached_farmer_at AS reachedFarmerAt,
         o.picked_up_at AS pickedUpAt,
         o.in_transit_at AS inTransitAt,
         o.out_for_delivery_at AS outForDeliveryAt,
         o.delivered_at AS deliveredAt,
         o.created_at AS createdAt,
         b.name AS buyerName,
         b.email AS buyerEmail,
         b.phone AS buyerPhone
       FROM orders o
       JOIN users b ON b.u_id = o.business_id
       WHERE o.delivery_boy_id = ?
       ORDER BY
         CASE
           WHEN o.status IN ('Going to Farmer', 'Reached Farmer', 'Delivery Boy Assigned', 'Picked Up', 'In Transit', 'Out for Delivery') THEN 1
           WHEN o.status = 'Delivered' THEN 2
           ELSE 3
         END,
         o.created_at DESC`,
      [riderId]
    );

    if (orders.length === 0) {
      return res.json({ activeOrders: [], completedOrders: [] });
    }

    const orderIds = orders.map((o) => o.id);
    const placeholders = orderIds.map(() => "?").join(",");

    // Fetch items for these orders, with product and farmer details
    const [items] = await pool.execute(
      `SELECT
         oi.oi_id AS id,
         oi.order_id AS orderId,
         oi.product_id AS productId,
         oi.farmer_id AS farmerId,
         oi.quantity,
         oi.unit_price AS unitPrice,
         oi.total,
         p.name AS productName,
         p.category AS productCategory,
         p.unit AS productUnit,
         p.location AS farmLocation,
         p.image_url AS productImage,
         f.name AS farmerName,
         f.phone AS farmerPhone,
         f.email AS farmerEmail
       FROM order_items oi
       JOIN products p ON oi.product_id = p.p_id
       JOIN users f ON oi.farmer_id = f.u_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.oi_id ASC`,
      orderIds
    );

    const itemsByOrder = new Map();
    for (const item of items) {
      if (!itemsByOrder.has(item.orderId)) {
        itemsByOrder.set(item.orderId, []);
      }
      itemsByOrder.get(item.orderId).push(item);
    }

    // Attach items and farmer pickup info to each order
    const enrichedOrders = orders.map((order) => {
      const orderItems = itemsByOrder.get(order.id) || [];
      const distinctFarmers = [];
      const seenFarmerIds = new Set();
      for (const item of orderItems) {
        if (!seenFarmerIds.has(item.farmerId)) {
          seenFarmerIds.add(item.farmerId);
          distinctFarmers.push({
            id: item.farmerId,
            name: item.farmerName,
            phone: item.farmerPhone || "",
            email: item.farmerEmail || "",
            farmLocation: item.farmLocation || "Farm Location",
          });
        }
      }

      return {
        ...order,
        items: orderItems,
        farmers: distinctFarmers,
        farmerName: distinctFarmers.map((f) => f.name).join(", ") || "Farmer",
        farmerPhone: distinctFarmers[0]?.phone || "",
        farmLocation: distinctFarmers[0]?.farmLocation || "Farm location",
        productSummary: orderItems.map((i) => `${i.productName} (${i.quantity} ${i.productUnit})`).join(", "),
      };
    });

    const activeOrders = enrichedOrders.filter((o) =>
      ["Going to Farmer", "Reached Farmer", "Delivery Boy Assigned", "Picked Up", "In Transit", "Out for Delivery"].includes(o.status)
    );
    const completedOrders = enrichedOrders.filter((o) =>
      ["Delivered", "Cancelled", "CANCELLED_BY_BUYER"].includes(o.status)
    );

    res.json({ activeOrders, completedOrders, allOrders: enrichedOrders });
  } catch (error) {
    console.error("Get assigned orders error:", error);
    res.status(500).json({ message: "Could not load assigned orders." });
  }
};

// Returns single assigned order detail for delivery rider
export const getAssignedOrderDetails = async (req, res) => {
  try {
    const riderId = req.user.id;
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const [orders] = await pool.execute(
      `SELECT
         o.o_id AS id,
         o.status,
         o.total,
         o.payment_method AS paymentMethod,
         o.payment_status AS paymentStatus,
         o.tracking_code AS trackingCode,
         o.delivery_name AS deliveryName,
         o.delivery_phone AS deliveryPhone,
         o.delivery_address AS deliveryAddress,
         o.delivery_notes AS deliveryNotes,
         o.assigned_at AS assignedAt,
         o.reached_farmer_at AS reachedFarmerAt,
         o.picked_up_at AS pickedUpAt,
         o.in_transit_at AS inTransitAt,
         o.out_for_delivery_at AS outForDeliveryAt,
         o.delivered_at AS deliveredAt,
         o.created_at AS createdAt,
         b.name AS buyerName,
         b.phone AS buyerPhone,
         b.email AS buyerEmail
       FROM orders o
       JOIN users b ON b.u_id = o.business_id
       WHERE o.o_id = ? AND o.delivery_boy_id = ?`,
      [orderId, riderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found or not assigned to you." });
    }
    const order = orders[0];

    const [items] = await pool.execute(
      `SELECT
         oi.oi_id AS id,
         oi.product_id AS productId,
         oi.farmer_id AS farmerId,
         oi.quantity,
         oi.unit_price AS unitPrice,
         oi.total,
         p.name AS productName,
         p.category AS productCategory,
         p.unit AS productUnit,
         p.location AS farmLocation,
         p.image_url AS productImage,
         f.name AS farmerName,
         f.phone AS farmerPhone
       FROM order_items oi
       JOIN products p ON oi.product_id = p.p_id
       JOIN users f ON oi.farmer_id = f.u_id
       WHERE oi.order_id = ?
       ORDER BY oi.oi_id ASC`,
      [orderId]
    );

    const distinctFarmers = [];
    const seenFarmerIds = new Set();
    for (const item of items) {
      if (!seenFarmerIds.has(item.farmerId)) {
        seenFarmerIds.add(item.farmerId);
        distinctFarmers.push({
          id: item.farmerId,
          name: item.farmerName,
          phone: item.farmerPhone || "",
          farmLocation: item.farmLocation || "",
        });
      }
    }

    const [events] = await pool.execute(
      `SELECT ote_id AS id, status, note, created_at AS createdAt
       FROM order_tracking_events
       WHERE order_id = ?
       ORDER BY created_at ASC`,
      [orderId]
    );

    const [locations] = await pool.execute(
      `SELECT odl_id AS id, latitude, longitude, note, created_at AS createdAt
       FROM order_delivery_locations
       WHERE order_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      [orderId]
    );

    res.json({
      order: {
        ...order,
        items,
        farmers: distinctFarmers,
        farmerName: distinctFarmers.map((f) => f.name).join(", "),
        farmerPhone: distinctFarmers[0]?.phone || "",
        farmLocation: distinctFarmers[0]?.farmLocation || "",
      },
      events,
      latestLocation: locations[0] || null,
      locations,
    });
  } catch (error) {
    console.error("Get assigned order details error:", error);
    res.status(500).json({ message: "Could not load order details." });
  }
};

// Rider advances delivery workflow:
// Going to Farmer -> Reached Farmer -> In Transit / Out for Delivery (Start Delivery) -> Delivered (with Buyer OTP)
export const updateDeliveryWorkflowStatus = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const riderId = req.user.id;
    const orderId = Number(req.params.id);
    const { status, note, otp } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const validStatuses = [
      "Going to Farmer",
      "Reached Farmer",
      "Picked Up",
      "In Transit",
      "Out for Delivery",
      "Delivered",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid delivery status. Choose one of: ${validStatuses.join(", ")}`,
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Check order is assigned to this rider
    const [orders] = await connection.execute(
      `SELECT o.o_id AS id, o.business_id, o.status, o.payment_method, o.payment_status,
              o.delivery_otp, o.tracking_code,
              u.name AS riderName, u.phone AS riderPhone,
              b.name AS buyerName
       FROM orders o
       JOIN users u ON u.u_id = o.delivery_boy_id
       JOIN users b ON b.u_id = o.business_id
       WHERE o.o_id = ? AND o.delivery_boy_id = ?
       FOR UPDATE`,
      [orderId, riderId]
    );

    const order = orders[0];
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found or not assigned to you." });
    }

    // Allowed status transitions
    const allowedTransitions = {
      "Accepted": ["Going to Farmer", "Reached Farmer", "Picked Up"],
      "Delivery Boy Assigned": ["Going to Farmer", "Reached Farmer", "Picked Up"],
      "Going to Farmer": ["Reached Farmer", "Picked Up", "In Transit", "Out for Delivery"],
      "Reached Farmer": ["Picked Up", "In Transit", "Out for Delivery"],
      "Picked Up": ["In Transit", "Out for Delivery"],
      "In Transit": ["Out for Delivery", "Delivered"],
      "Out for Delivery": ["Delivered"],
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        message: `Cannot transition order status from '${order.status}' to '${status}'.`,
      });
    }

    // OTP Verification when transitioning to Delivered
    if (status === "Delivered") {
      const submittedOtp = typeof otp === "string" || typeof otp === "number" ? String(otp).trim() : "";
      const expectedOtp = order.delivery_otp ? String(order.delivery_otp).trim() : "";

      if (!expectedOtp || submittedOtp !== expectedOtp) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid Delivery Confirmation OTP. Please ask the buyer for the 4-digit code shown on their tracking screen.",
        });
      }
    }

    // Generate OTP if transitioning to In Transit or Out for Delivery and OTP not yet set
    let activeOtp = order.delivery_otp;
    if (["In Transit", "Out for Delivery"].includes(status) && !activeOtp) {
      activeOtp = String(Math.floor(1000 + Math.random() * 9000));
    }

    // Timestamp column to update
    const timestampUpdates = [];
    if (status === "Reached Farmer") timestampUpdates.push("reached_farmer_at = CURRENT_TIMESTAMP");
    if (status === "Picked Up" || status === "In Transit" || status === "Out for Delivery") {
      if (!order.picked_up_at) timestampUpdates.push("picked_up_at = CURRENT_TIMESTAMP");
      if (!order.in_transit_at) timestampUpdates.push("in_transit_at = CURRENT_TIMESTAMP");
    }
    if (status === "Out for Delivery") timestampUpdates.push("out_for_delivery_at = CURRENT_TIMESTAMP");
    if (status === "Delivered") timestampUpdates.push("delivered_at = CURRENT_TIMESTAMP");

    const nextPaymentStatus =
      status === "Delivered" && order.payment_method === "COD"
        ? "PAID"
        : order.payment_status;

    // Update main order
    const updateOrderQuery = `
      UPDATE orders
      SET status = ?,
          payment_status = ?,
          delivery_otp = ?,
          ${timestampUpdates.length > 0 ? timestampUpdates.join(", ") + "," : ""}
          delivery_notes = COALESCE(?, delivery_notes)
      WHERE o_id = ?
    `;
    await connection.execute(updateOrderQuery, [
      status,
      nextPaymentStatus,
      activeOtp,
      note || null,
      orderId,
    ]);

    // Update order items status
    await connection.execute(
      `UPDATE order_items SET status = ? WHERE order_id = ?`,
      [status, orderId]
    );

    // If COD delivered, update payments table
    if (status === "Delivered" && order.payment_method === "COD") {
      await connection.execute(
        `UPDATE payments SET payment_status = 'PAID' WHERE order_id = ?`,
        [orderId]
      );
    }

    // Milestone descriptions
    const milestoneNotes = {
      "Going to Farmer": `Delivery partner ${order.riderName} is on the way to the farm for harvest pickup.`,
      "Reached Farmer": `Delivery partner ${order.riderName} reached the farm location for pickup.`,
      "Picked Up": `Produce picked up from the farm by delivery partner ${order.riderName}.`,
      "In Transit": `Delivery partner ${order.riderName} started delivery. In transit towards buyer location.`,
      "Out for Delivery": `Order #${orderId} is out for delivery! Rider ${order.riderName} is arriving soon.`,
      "Delivered": `Order #${orderId} successfully delivered by ${order.riderName}. OTP verified.`,
    };
    const finalNote = (typeof note === "string" && note.trim()) ? note.trim() : milestoneNotes[status];

    // Log tracking event
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [orderId, status, finalNote]
    );

    // Fetch distinct farmers for this order for notifications
    const [orderFarmers] = await connection.execute(
      `SELECT DISTINCT farmer_id FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    // Automated Notifications
    if (status === "Reached Farmer") {
      // Notify Farmer that Rider has arrived
      for (const f of orderFarmers) {
        await connection.execute(
          `INSERT INTO order_notifications (user_id, order_id, type, title, message)
           VALUES (?, ?, 'RIDER_ARRIVED_FARM', 'Delivery Partner Arrived at Farm', ?)
           ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
          [
            f.farmer_id,
            orderId,
            `Delivery partner ${order.riderName} (${order.riderPhone || ""}) has arrived at your farm. Please hand over the produce for Order #${orderId}.`,
          ]
        );
      }
      // Notify Buyer
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'RIDER_REACHED_FARM_BUYER', 'Rider at Farm Pickup', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Delivery partner ${order.riderName} has arrived at the farm for harvest pickup.`,
        ]
      );
      // Notify Rider
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'RIDER_ARRIVED_FARM', 'Arrived at Farm', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          riderId,
          orderId,
          `You have arrived at the farm for Order #${orderId}. Inspect produce and coordinate handover with the farmer.`,
        ]
      );
    } else if (status === "In Transit" || status === "Picked Up") {
      // Notify Buyer
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_IN_TRANSIT', 'Order In Transit to You', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} has been picked up and is in transit towards your location with rider ${order.riderName}. Handover OTP: ${activeOtp}`,
        ]
      );
      // Notify Farmer
      for (const f of orderFarmers) {
        await connection.execute(
          `INSERT INTO order_notifications (user_id, order_id, type, title, message)
           VALUES (?, ?, 'ORDER_DEPARTED_FARM', 'Produce Departed Farm', ?)
           ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
          [
            f.farmer_id,
            orderId,
            `Order #${orderId} has departed your farm with delivery partner ${order.riderName}.`,
          ]
        );
      }
      // Notify Rider
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_IN_TRANSIT', 'Produce In Transit', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          riderId,
          orderId,
          `Order #${orderId} collected from farm and is now in transit towards buyer. Collect OTP on delivery.`,
        ]
      );
    } else if (status === "Out for Delivery") {
      // Notify Buyer with OTP
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_OUT_FOR_DELIVERY', 'Out for Delivery', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} is out for delivery! Your secret delivery confirmation OTP is ${activeOtp}. Please share this code with ${order.riderName} upon arrival.`,
        ]
      );
      // Notify Rider
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_OUT_FOR_DELIVERY', 'Out for Delivery', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          riderId,
          orderId,
          `Out for final delivery for Order #${orderId}. Enter buyer's 4-digit OTP to complete drop.`,
        ]
      );
    } else if (status === "Delivered") {
      // Notify Buyer
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_DELIVERED', 'Order Delivered Successfully', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} has been successfully delivered and verified with OTP confirmation. Thank you for choosing FarmLink!`,
        ]
      );
      // Notify Farmer
      for (const f of orderFarmers) {
        await connection.execute(
          `INSERT INTO order_notifications (user_id, order_id, type, title, message)
           VALUES (?, ?, 'ORDER_DELIVERED_FARMER', 'Order Delivered to Buyer', ?)
           ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
          [
            f.farmer_id,
            orderId,
            `Order #${orderId} has been successfully delivered to ${order.buyerName}. Verified with OTP.`,
          ]
        );
      }
      // Notify Rider
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_DELIVERED', 'Delivery Completed', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          riderId,
          orderId,
          `Order #${orderId} successfully delivered to ${order.buyerName}! Confirmed with buyer OTP. Delivery payout recorded.`,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    res.json({
      message: `Order status updated to '${status}' successfully.`,
      status,
      orderId,
      deliveryOtp: ["In Transit", "Out for Delivery"].includes(status) ? activeOtp : undefined,
    });
  } catch (error) {
    console.error("Update delivery workflow status error:", error);
    if (connection && transactionStarted) await connection.rollback();
    res.status(500).json({ message: error.message || "Could not update delivery status." });
  } finally {
    if (connection) connection.release();
  }
};

// Delivery rider posts real-time GPS coordinates
export const updateDeliveryLocation = async (req, res) => {
  try {
    const riderId = req.user.id;
    const orderId = Number(req.params.id);
    const { latitude, longitude, speed, heading, accuracy, note } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Valid GPS latitude and longitude are required." });
    }

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    // Verify order is assigned to this rider
    const [orders] = await pool.execute(
      `SELECT o_id AS id, status FROM orders WHERE o_id = ? AND delivery_boy_id = ?`,
      [orderId, riderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found or not assigned to you." });
    }

    const cleanNote =
      typeof note === "string" && note.trim()
        ? note.trim().slice(0, 255)
        : "Delivery partner shared live GPS location.";

    // Insert into order_delivery_locations
    await pool.execute(
      `INSERT INTO order_delivery_locations (order_id, delivery_boy_id, latitude, longitude, speed, heading, accuracy, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        riderId,
        lat,
        lng,
        Number.isFinite(Number(speed)) ? Number(speed) : null,
        Number.isFinite(Number(heading)) ? Number(heading) : null,
        Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
        cleanNote,
      ]
    );

    // Update rider's current location on users table
    await pool.execute(
      `UPDATE users
       SET current_latitude = ?, current_longitude = ?, last_location_time = CURRENT_TIMESTAMP
       WHERE u_id = ?`,
      [lat, lng, riderId]
    );

    res.status(201).json({
      message: "Delivery location broadcasted successfully.",
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update delivery location error:", error);
    res.status(500).json({ message: "Could not update delivery location." });
  }
};

// Rider toggles availability: AVAILABLE, BUSY, OFFLINE
export const updateAvailability = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { status } = req.body;

    const normalizedStatus = String(status || "").toUpperCase();
    if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Status must be AVAILABLE, BUSY, or OFFLINE.",
      });
    }

    await pool.execute(
      `UPDATE users SET availability_status = ? WHERE u_id = ? AND account_type = 'delivery'`,
      [normalizedStatus, riderId]
    );

    res.json({
      message: `Availability status updated to ${normalizedStatus}.`,
      availabilityStatus: normalizedStatus,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ message: "Could not update availability status." });
  }
};
