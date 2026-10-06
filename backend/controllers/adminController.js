import pool from "../config/db.js";

// Only the admin route calls this controller. It returns operational data,
// never password hashes or other authentication secrets.
export const getDashboardData = async (req, res) => {
  try {
    const [[summary]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE account_type = 'farmer') AS farmers,
        (SELECT COUNT(*) FROM users WHERE account_type = 'business') AS businesses,
        (SELECT COUNT(*) FROM users WHERE account_type = 'delivery') AS deliveryBoys,
        (SELECT COUNT(*) FROM users WHERE account_type = 'delivery' AND availability_status = 'AVAILABLE') AS availableDeliveryBoys,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM orders WHERE status IN ('Accepted', 'Delivery Boy Assigned', 'Picked Up', 'In Transit', 'Out for Delivery')) AS activeDeliveries,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'Delivered') AS deliveredSales
    `);

    const [farmers] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.phone, u.created_at AS createdAt,
        u.is_deleted AS isDeleted, u.removal_reason AS removalReason, u.removed_at AS removedAt,
        (SELECT COUNT(*) FROM products p WHERE p.farmer_id = u.u_id) AS productCount,
        (SELECT COUNT(DISTINCT oi.order_id) FROM order_items oi WHERE oi.farmer_id = u.u_id) AS orderCount
      FROM users u
      WHERE u.account_type = 'farmer'
      ORDER BY u.created_at DESC
    `);

    const [businesses] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.phone, u.created_at AS createdAt,
        u.is_deleted AS isDeleted, u.removal_reason AS removalReason, u.removed_at AS removedAt,
        (SELECT COUNT(*) FROM orders o WHERE o.business_id = u.u_id) AS orderCount,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.business_id = u.u_id) AS orderValue
      FROM users u
      WHERE u.account_type = 'business'
      ORDER BY u.created_at DESC
    `);

    const [deliveryBoys] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.phone,
             u.vehicle_type AS vehicleType, u.vehicle_number AS vehicleNumber,
             u.availability_status AS availabilityStatus,
             u.current_latitude AS currentLatitude, u.current_longitude AS currentLongitude,
             u.last_location_time AS lastLocationTime,
             u.created_at AS createdAt,
             u.is_deleted AS isDeleted, u.removal_reason AS removalReason, u.removed_at AS removedAt,
             (SELECT COUNT(*) FROM orders o WHERE o.delivery_boy_id = u.u_id AND o.status IN ('Delivery Boy Assigned', 'Picked Up', 'In Transit', 'Out for Delivery')) AS activeDeliveriesCount,
             (SELECT COUNT(*) FROM orders o WHERE o.delivery_boy_id = u.u_id AND o.status = 'Delivered') AS completedDeliveriesCount
      FROM users u
      WHERE u.account_type = 'delivery'
      ORDER BY u.created_at DESC
    `);

    const [products] = await pool.execute(`
      SELECT p.p_id AS id, p.name, p.category, p.quantity, p.unit, p.price, p.location,
        p.created_at AS createdAt, u.name AS farmerName, u.email AS farmerEmail
      FROM products p
      JOIN users u ON u.u_id = p.farmer_id
      ORDER BY p.created_at DESC
    `);

    const [orders] = await pool.execute(`
      SELECT o.o_id AS id, o.total, o.status, o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus, o.tracking_code AS trackingCode,
        o.delivery_name AS deliveryName, o.delivery_phone AS deliveryPhone,
        o.delivery_address AS deliveryAddress,
        o.delivery_boy_id AS deliveryBoyId,
        d.name AS deliveryBoyName,
        d.phone AS deliveryBoyPhone,
        d.vehicle_type AS deliveryBoyVehicle,
        o.assigned_at AS assignedAt,
        o.picked_up_at AS pickedUpAt,
        o.out_for_delivery_at AS outForDeliveryAt,
        o.delivered_at AS deliveredAt,
        o.created_at AS createdAt,
        b.name AS businessName,
        b.phone AS businessPhone,
        COALESCE(
          (SELECT GROUP_CONCAT(p.name SEPARATOR ', ')
           FROM order_items oi
           JOIN products p ON p.p_id = oi.product_id
           WHERE oi.order_id = o.o_id), 'Produce'
        ) AS productName,
        COALESCE(
          (SELECT GROUP_CONCAT(DISTINCT f.name SEPARATOR ', ')
           FROM order_items oi
           JOIN users f ON f.u_id = oi.farmer_id
           WHERE oi.order_id = o.o_id), 'Farmer'
        ) AS farmerName,
        COALESCE(
          (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.o_id), 0
        ) AS quantity
      FROM orders o
      JOIN users b ON b.u_id = o.business_id
      LEFT JOIN users d ON d.u_id = o.delivery_boy_id
      ORDER BY o.created_at DESC
    `);

    return res.json({ summary, farmers, businesses, deliveryBoys, products, orders });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return res.status(500).json({ message: "Could not load admin dashboard data." });
  }
};

// Admin lists all registered delivery boys/riders
export const getDeliveryBoys = async (req, res) => {
  try {
    const [deliveryBoys] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.phone,
             u.vehicle_type AS vehicleType, u.vehicle_number AS vehicleNumber,
             u.availability_status AS availabilityStatus,
             u.current_latitude AS currentLatitude, u.current_longitude AS currentLongitude,
             u.last_location_time AS lastLocationTime,
             u.created_at AS createdAt,
             (SELECT COUNT(*) FROM orders o WHERE o.delivery_boy_id = u.u_id AND o.status IN ('Delivery Boy Assigned', 'Picked Up', 'In Transit', 'Out for Delivery')) AS activeDeliveriesCount,
             (SELECT COUNT(*) FROM orders o WHERE o.delivery_boy_id = u.u_id AND o.status = 'Delivered') AS completedDeliveriesCount
      FROM users u
      WHERE u.account_type = 'delivery'
      ORDER BY
        CASE WHEN u.availability_status = 'AVAILABLE' THEN 1 WHEN u.availability_status = 'BUSY' THEN 2 ELSE 3 END,
        u.name ASC
    `);

    res.json(deliveryBoys);
  } catch (error) {
    console.error("Get delivery boys error:", error);
    res.status(500).json({ message: "Could not load delivery boys." });
  }
};

// Admin assigns or reassigns a delivery boy to an order
export const assignDeliveryBoy = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const deliveryBoyId = Number(req.body.deliveryBoyId);
    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : null;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
    if (!Number.isInteger(deliveryBoyId) || deliveryBoyId <= 0) {
      return res.status(400).json({ message: "Please select a valid delivery partner." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Check delivery boy exists
    const [riders] = await connection.execute(
      `SELECT u_id AS id, name, phone, vehicle_type AS vehicleType, vehicle_number AS vehicleNumber, availability_status AS availabilityStatus
       FROM users WHERE u_id = ? AND account_type = 'delivery'`,
      [deliveryBoyId]
    );
    const rider = riders[0];
    if (!rider) {
      await connection.rollback();
      return res.status(404).json({ message: "Delivery partner not found." });
    }

    // Check order
    const [orders] = await connection.execute(
      `SELECT o.o_id AS id, o.business_id, o.status, o.delivery_boy_id, b.name AS buyerName
       FROM orders o
       JOIN users b ON b.u_id = o.business_id
       WHERE o.o_id = ? FOR UPDATE`,
      [orderId]
    );
    const order = orders[0];
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found." });
    }

    if (["Delivered", "Cancelled", "CANCELLED_BY_BUYER"].includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({ message: `Cannot assign rider to a ${order.status} order.` });
    }

    const nextStatus =
      order.status === "Pending" || order.status === "Accepted"
        ? "Delivery Boy Assigned"
        : order.status;

    // Update order
    await connection.execute(
      `UPDATE orders
       SET delivery_boy_id = ?,
           assigned_at = CURRENT_TIMESTAMP,
           status = ?,
           delivery_notes = COALESCE(?, delivery_notes)
       WHERE o_id = ?`,
      [deliveryBoyId, nextStatus, notes, orderId]
    );

    // Update order items
    await connection.execute(
      `UPDATE order_items SET status = ? WHERE order_id = ?`,
      [nextStatus, orderId]
    );

    // Log tracking event
    const eventNote = `Delivery partner ${rider.name} (${rider.vehicleType || "Vehicle"} - ${rider.phone || "No phone"}) assigned to this order.`;
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [orderId, nextStatus, eventNote]
    );

    // Fetch farmers
    const [orderFarmers] = await connection.execute(
      `SELECT DISTINCT farmer_id FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    // Notify Buyer
    await connection.execute(
      `INSERT INTO order_notifications (user_id, order_id, type, title, message)
       VALUES (?, ?, 'ORDER_RIDER_ASSIGNED', 'Delivery Partner Assigned', ?)
       ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
      [
        order.business_id,
        orderId,
        `Delivery partner ${rider.name} (${rider.phone || ""}) has been assigned to deliver your Order #${orderId}.`,
      ]
    );

    // Notify Farmers
    for (const f of orderFarmers) {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_RIDER_ASSIGNED_FARMER', 'Delivery Partner Assigned', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          f.farmer_id,
          orderId,
          `Delivery partner ${rider.name} (${rider.phone || ""}) will pick up order #${orderId} from your farm.`,
        ]
      );
    }

    // Notify Delivery Boy
    await connection.execute(
      `INSERT INTO order_notifications (user_id, order_id, type, title, message)
       VALUES (?, ?, 'ORDER_ASSIGNED_TO_RIDER', 'New Order Assigned', ?)
       ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
      [
        deliveryBoyId,
        orderId,
        `You have been assigned to deliver Order #${orderId} to ${order.buyerName}. Check your dashboard for pickup details.`,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    res.json({
      message: `Delivery partner ${rider.name} assigned to Order #${orderId} successfully.`,
      orderId,
      deliveryBoyId,
      riderName: rider.name,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Assign delivery boy error:", error);
    if (connection && transactionStarted) await connection.rollback();
    res.status(500).json({ message: error.message || "Could not assign delivery partner." });
  } finally {
    if (connection) connection.release();
  }
};

// Admin updates delivery boy status / availability
export const updateDeliveryBoyStatus = async (req, res) => {
  try {
    const riderId = Number(req.params.id);
    const { availabilityStatus } = req.body;

    if (!Number.isInteger(riderId) || riderId <= 0) {
      return res.status(400).json({ message: "Invalid rider ID." });
    }

    const normalized = String(availabilityStatus || "").toUpperCase();
    if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(normalized)) {
      return res.status(400).json({ message: "Status must be AVAILABLE, BUSY, or OFFLINE." });
    }

    const [result] = await pool.execute(
      `UPDATE users SET availability_status = ? WHERE u_id = ? AND account_type = 'delivery'`,
      [normalized, riderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Delivery rider not found." });
    }

    res.json({ message: `Rider availability set to ${normalized}.`, availabilityStatus: normalized });
  } catch (error) {
    console.error("Update delivery boy status error:", error);
    res.status(500).json({ message: "Could not update rider status." });
  }
};

// Admin removes an existing user (farmer, buyer, or delivery rider) with a mandatory reason
export const removeUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { reason } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A reason for removing this user is required." });
    }

    const [users] = await pool.execute(
      "SELECT u_id, name, email, account_type, is_deleted FROM users WHERE u_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const targetUser = users[0];
    if (targetUser.account_type === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be removed." });
    }

    const trimmedReason = reason.trim();

    await pool.execute(
      `UPDATE users
       SET is_deleted = 1,
           removal_reason = ?,
           removed_at = CURRENT_TIMESTAMP,
           availability_status = 'OFFLINE'
       WHERE u_id = ?`,
      [trimmedReason, userId]
    );

    // If removed user is a farmer, set listed products quantity to 0 so they don't show available in marketplace
    if (targetUser.account_type === "farmer") {
      await pool.execute("UPDATE products SET quantity = 0 WHERE farmer_id = ?", [userId]);
    }

    res.json({
      message: `User ${targetUser.name} (${targetUser.account_type}) removed successfully.`,
      userId,
      reason: trimmedReason,
    });
  } catch (error) {
    console.error("Remove user error:", error);
    res.status(500).json({ message: "Could not remove user." });
  }
};


