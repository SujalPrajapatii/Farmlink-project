import pool from "../config/db.js";

// Business buyer creates an order.
// The buyer must select:
// 1. A product
// 2. Quantity
// 3. Saved delivery address
// 4. Payment method: COD or ONLINE
export const placeOrder = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const productId = Number(req.body.productId);
    const requestedQuantity = Number(req.body.quantity);
    const addressId = Number(req.body.addressId);
    const paymentMethod = req.body.paymentMethod;

    // Validate product ID.
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "A valid product is required.",
      });
    }

    // Valid examples: 1, 2, 10
    // Invalid examples: 0, -1, 1.5, "hello"
    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a positive whole number.",
      });
    }

    // Buyer must select one of their saved addresses.
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        message: "Please select a delivery address.",
      });
    }

    // COD = Cash on Delivery / offline payment.
    // ONLINE = Razorpay or another online payment gateway.
    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Payment method must be COD or ONLINE.",
      });
    }

    // Comes from JWT token, so buyer cannot create an order for another user.
    const businessId = req.user.id;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the product row while ordering.
    // This prevents two buyers from purchasing the same stock at once.
    const [products] = await connection.execute(
      `SELECT id, farmer_id, quantity, price
       FROM products
       WHERE id = ?
       FOR UPDATE`,
      [productId]
    );

    const product = products[0];

    if (!product) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Product not found.",
      });
    }

    // Ensure enough stock exists.
    if (Number(product.quantity) < requestedQuantity) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Requested quantity is not available.",
      });
    }

    // Get the delivery address only if it belongs to this business buyer.
    const [addresses] = await connection.execute(
      `SELECT
        id,
        recipient_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        pincode
       FROM delivery_addresses
       WHERE id = ? AND business_id = ?`,
      [addressId, businessId]
    );

    const address = addresses[0];

    if (!address) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Delivery address not found.",
      });
    }

    // Create one readable address string to save permanently on the order.
    const fullAddress = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    // The server calculates price. The frontend must never send total price.
    const total = Number(product.price) * requestedQuantity;

    // Stock is reserved in this transaction, so COD orders are immediately
    // accepted. The farmer only needs to arrange delivery.
    // ONLINE orders wait until the payment gateway confirms the payment.
    const initialStatus =
      paymentMethod === "ONLINE" ? "Awaiting Payment" : "Accepted";

    const initialPaymentStatus =
      paymentMethod === "ONLINE" ? "PENDING" : "PENDING";

    // Create the order and store a snapshot of the delivery details.
    const [result] = await connection.execute(
      `INSERT INTO orders
      (
        product_id,
        business_id,
        farmer_id,
        quantity,
        unit_price,
        total,
        status,
        delivery_address_id,
        delivery_name,
        delivery_phone,
        delivery_address,
        payment_method,
        payment_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        businessId,
        product.farmer_id,
        requestedQuantity,
        product.price,
        total,
        initialStatus,
        address.id,
        address.recipient_name,
        address.phone,
        fullAddress,
        paymentMethod,
        initialPaymentStatus,
      ]
    );

    const orderId = result.insertId;
    const trackingCode = `FL-${String(orderId).padStart(8, "0")}`;

    // Every order receives a stable, customer-friendly tracking reference.
    await connection.execute(
      "UPDATE orders SET tracking_code = ? WHERE id = ?",
      [trackingCode, orderId]
    );

    // Add the first tracking event.
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note)
       VALUES (?, ?, ?)`,
      [
        orderId,
        initialStatus,
        paymentMethod === "ONLINE"
          ? "Waiting for online payment."
          : "Order accepted automatically because stock is available.",
      ]
    );

    // Reserve stock immediately.
    // If an order is cancelled, the stock is returned in updateOrderStatus.
    await connection.execute(
      "UPDATE products SET quantity = quantity - ? WHERE id = ?",
      [requestedQuantity, productId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message:
        paymentMethod === "ONLINE"
          ? "Order created. Complete online payment."
          : "Order accepted automatically. The farmer will arrange delivery.",
      orderId,
      trackingCode,
      status: initialStatus,
      paymentMethod,
      total,
    });
  } catch (error) {
    console.error("Place order error:", error);

    if (connection && transactionStarted) {
      await connection.rollback();
    }

    return res.status(500).json({
      message: "Could not place order.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Farmer sees received orders.
// Business user sees orders they placed.
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = req.user.accountType;

    let query;
    let values;

    if (accountType === "farmer") {
      query = `
        SELECT
          o.id,
          o.quantity,
          o.unit_price AS unitPrice,
          o.total,
          o.status,
          o.payment_method AS paymentMethod,
          o.payment_status AS paymentStatus,
          o.tracking_code AS trackingCode,
          o.delivery_name AS deliveryName,
          o.delivery_phone AS deliveryPhone,
          o.delivery_address AS deliveryAddress,
          o.created_at AS createdAt,
          p.name AS productName,
          p.category AS productCategory,
          b.name AS businessName
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users b ON o.business_id = b.id
        WHERE o.farmer_id = ? AND o.status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')
        ORDER BY o.created_at DESC
      `;

      values = [userId];
    } else if (accountType === "business") {
      query = `
        SELECT
          o.id,
          o.quantity,
          o.unit_price AS unitPrice,
          o.total,
          o.status,
          o.payment_method AS paymentMethod,
          o.payment_status AS paymentStatus,
          o.tracking_code AS trackingCode,
          o.created_at AS createdAt,
          p.name AS productName,
          p.category AS productCategory,
          f.name AS farmerName
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users f ON o.farmer_id = f.id
        WHERE o.business_id = ? AND o.status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')
        ORDER BY o.created_at DESC
      `;

      values = [userId];
    } else {
      return res.status(403).json({
        message: "You cannot view these orders.",
      });
    }

    const [orders] = await pool.execute(query, values);

    return res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      message: "Could not get orders.",
    });
  }
};

// Creates all cart items atomically. The existing schema stores one product per
// order, so a cart checkout produces linked individual order records while the
// buyer completes one checkout, address selection and payment choice.
export const placeCartOrder = async (req, res) => {
  let connection;
  try {
    const { items, addressId: rawAddressId, paymentMethod } = req.body;
    const addressId = Number(rawAddressId);
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Your cart is empty." });
    if (!Number.isInteger(addressId) || addressId <= 0) return res.status(400).json({ message: "Please select a delivery address." });
    if (!['COD', 'ONLINE'].includes(paymentMethod)) return res.status(400).json({ message: "Payment method must be COD or ONLINE." });

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [addresses] = await connection.execute(
      `SELECT id, recipient_name, phone, address_line1, address_line2, city, state, pincode
       FROM delivery_addresses WHERE id = ? AND business_id = ?`, [addressId, req.user.id]
    );
    const address = addresses[0];
    if (!address) throw Object.assign(new Error("Delivery address not found."), { status: 404 });
    const fullAddress = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
    const createdOrders = [];

    for (const item of items) {
      const productId = Number(item.productId), quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error("Every cart item needs a valid quantity."), { status: 400 });
      const [products] = await connection.execute(`SELECT id, farmer_id, quantity, price FROM products WHERE id = ? FOR UPDATE`, [productId]);
      const product = products[0];
      if (!product) throw Object.assign(new Error("A cart product is no longer available."), { status: 404 });
      if (Number(product.quantity) < quantity) throw Object.assign(new Error("One or more cart quantities are no longer available."), { status: 400 });
      const total = Number(product.price) * quantity;
      const status = paymentMethod === 'ONLINE' ? 'Awaiting Payment' : 'Accepted';
      const [result] = await connection.execute(
        `INSERT INTO orders (product_id, business_id, farmer_id, quantity, unit_price, total, status, delivery_address_id, delivery_name, delivery_phone, delivery_address, payment_method, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [productId, req.user.id, product.farmer_id, quantity, product.price, total, status, address.id, address.recipient_name, address.phone, fullAddress, paymentMethod]
      );
      const orderId = result.insertId, trackingCode = `FL-${String(orderId).padStart(8, '0')}`;
      await connection.execute("UPDATE orders SET tracking_code = ? WHERE id = ?", [trackingCode, orderId]);
      await connection.execute("INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)", [orderId, status, paymentMethod === 'ONLINE' ? 'Waiting for online payment.' : 'Order accepted automatically because stock is available.']);
      await connection.execute("UPDATE products SET quantity = quantity - ? WHERE id = ?", [quantity, productId]);
      createdOrders.push({ orderId, total });
    }
    await connection.commit();
    return res.status(201).json({ message: "Cart order placed successfully.", orders: createdOrders, total: createdOrders.reduce((sum, order) => sum + order.total, 0) });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Could not place cart order." });
  } finally { if (connection) connection.release(); }
};

// Small aggregate endpoint for dashboard cards. Keeping these totals on the
// server means the numbers are correct even while the detailed order list is
// still refreshing in the browser.
export const getOrderSummary = async (req, res) => {
  try {
    const ownerColumn = req.user.accountType === "farmer"
      ? "farmer_id"
      : req.user.accountType === "business"
        ? "business_id"
        : null;

    if (!ownerColumn) {
      return res.status(403).json({ message: "You cannot view order statistics." });
    }

    const [rows] = await pool.execute(
      `SELECT
         COUNT(*) AS totalOrders,
         COALESCE(SUM(status = 'Delivered'), 0) AS completedOrders,
         COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total ELSE 0 END), 0) AS completedTotal
       FROM orders
       WHERE ${ownerColumn} = ? AND status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')`,
      [req.user.id]
    );

    const summary = rows[0];
    return res.json({
      totalOrders: Number(summary.totalOrders),
      completedOrders: Number(summary.completedOrders),
      completedTotal: Number(summary.completedTotal),
    });
  } catch (error) {
    console.error("Get order summary error:", error);
    return res.status(500).json({ message: "Could not load order statistics." });
  }
};

// Returns tracking timeline to the farmer or buyer who owns the order.
export const getOrderTracking = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;
    const accountType = req.user.accountType;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    let ownershipColumn;

    if (accountType === "farmer") {
      ownershipColumn = "farmer_id";
    } else if (accountType === "business") {
      ownershipColumn = "business_id";
    } else {
      return res.status(403).json({
        message: "You cannot view this order.",
      });
    }

    // ownershipColumn is selected only from the two fixed strings above.
    const [orders] = await pool.execute(
      `SELECT
        o.id,
        o.status,
        o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus,
        o.tracking_code AS trackingCode,
        o.delivery_name AS deliveryName,
        o.delivery_phone AS deliveryPhone,
        o.delivery_address AS deliveryAddress,
        p.location AS farmLocation
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.id = ? AND o.${ownershipColumn} = ?`,
      [orderId, userId]
    );

    const order = orders[0];

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const [events] = await pool.execute(
      `SELECT
        id,
        status,
        note,
        created_at AS createdAt
      FROM order_tracking_events
      WHERE order_id = ?
      ORDER BY created_at ASC, id ASC`,
      [orderId]
    );

    const [locations] = await pool.execute(
  `SELECT
    id,
    latitude,
    longitude,
    note,
    created_at AS createdAt
   FROM order_delivery_locations
   WHERE order_id = ?
   ORDER BY created_at DESC`,
  [orderId]
);

const latestLocation = locations[0] || null;

    return res.json({
  order,
  events,
  latestLocation,
  locations,
});
  } catch (error) {
    console.error("Get order tracking error:", error);

    return res.status(500).json({
      message: "Could not get order tracking.",
    });
  }
};

// Farmer changes delivery/order status.
export const updateOrderStatus = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const { status, note, trackingCode } = req.body;
    const farmerId = req.user.id;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    // Allowed status values sent by frontend/Postman.
    const validStatuses = [
      "Accepted",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Get order only if it belongs to currently logged-in farmer.
    const [orders] = await connection.execute(
      `SELECT
        id,
        product_id,
        quantity,
        status,
        payment_method,
        payment_status
       FROM orders
       WHERE id = ? AND farmer_id = ?
       FOR UPDATE`,
      [orderId, farmerId]
    );

    const order = orders[0];

    if (!order) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // Defines the only valid order flow.
    const allowedChanges = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Out for Delivery", "Cancelled"],
      "Out for Delivery": ["Delivered"],
    };

    if (!allowedChanges[order.status]?.includes(status)) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: `Cannot change ${order.status} order to ${status}.`,
      });
    }

    // Cancellation returns reserved stock to the product.
    if (status === "Cancelled") {
      await connection.execute(
        "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        [order.quantity, order.product_id]
      );
    }

    // Cash on delivery becomes paid when the farmer marks the order delivered.
    const nextPaymentStatus =
      status === "Delivered" && order.payment_method === "COD"
        ? "PAID"
        : order.payment_status;

    // Tracking code is optional.
    // It can be a courier tracking number, delivery vehicle ID, etc.
    const cleanTrackingCode =
      typeof trackingCode === "string" && trackingCode.trim()
        ? trackingCode.trim()
        : null;

    await connection.execute(
      `UPDATE orders
       SET
         status = ?,
         payment_status = ?,
         tracking_code = COALESCE(?, tracking_code)
       WHERE id = ?`,
      [status, nextPaymentStatus, cleanTrackingCode, orderId]
    );

    // This is the code you asked about.
    // It saves every change as a tracking event for the buyer.
    const cleanNote =
      typeof note === "string" && note.trim()
        ? note.trim()
        : status === "Out for Delivery"
          ? "Your order is on the way."
          : `Order status changed to ${status}.`;

    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note)
       VALUES (?, ?, ?)`,
      [orderId, status, cleanNote]
    );

    await connection.commit();
    transactionStarted = false;

    return res.json({
      message: `Order ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    if (connection && transactionStarted) {
      await connection.rollback();
    }

    return res.status(500).json({
      message: "Could not update order status.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// A buyer or farmer can cancel an order while it has not yet left for delivery.
// The reserved quantity is restored atomically, so it immediately becomes
// available in the marketplace again.
export const cancelOrder = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;
    const accountType = req.user.accountType;
    const { reason, customReason } = req.body;
    const buyerReasons = ["I ordered by mistake", "I found a better price elsewhere", "I no longer need the product", "Delivery is taking too long", "I ordered the wrong quantity", "I want to change the order", "Payment-related issue", "Other reason"];
    const sellerReasons = ["Product is out of stock", "Unable to fulfill the requested quantity", "Product quality issue", "Product is no longer available", "Unable to deliver the order", "Price or order information issue", "Unexpected business/operational issue", "Buyer requested cancellation", "Other reason"];
    const allowedReasons = accountType === "farmer" ? sellerReasons : buyerReasons;
    if (!allowedReasons.includes(reason)) return res.status(400).json({ message: "Please select a valid cancellation reason." });
    const finalReason = reason === "Other reason" ? String(customReason || "").trim() : reason;
    if (!finalReason) return res.status(400).json({ message: "Please enter your cancellation reason." });

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const ownershipColumn = accountType === "farmer" ? "farmer_id" : "business_id";
    const allowedStatuses = accountType === "farmer"
      ? ["Pending", "Accepted"]
      : ["Awaiting Payment", "Pending", "Accepted"];

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [orders] = await connection.execute(
      `SELECT o.id, o.product_id, o.farmer_id, o.quantity, o.status,
              p.name AS productName, b.name AS buyerName
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.business_id
       WHERE o.id = ? AND o.${ownershipColumn} = ?
       FOR UPDATE`,
      [orderId, userId]
    );

    const order = orders[0];

    if (!order) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: "Order not found." });
    }

    if (!allowedStatuses.includes(order.status)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "This order can no longer be cancelled because delivery has started or it is already complete.",
      });
    }

    await connection.execute(
      "UPDATE products SET quantity = quantity + ? WHERE id = ?",
      [order.quantity, order.product_id]
    );

    const cancelledStatus = accountType === "business" ? "CANCELLED_BY_BUYER" : "Cancelled";
    const actorRole = accountType === "farmer" ? "FARMER" : "BUYER";
    await connection.execute(
      `UPDATE orders
       SET status = ?, cancelled_by_user_id = ?, cancelled_by_role = ?, cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cancelledStatus, userId, actorRole, finalReason, order.id]
    );

    const actor = accountType === "farmer" ? "seller" : "buyer";
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note)
       VALUES (?, ?, ?)`,
      [order.id, cancelledStatus, `Order cancelled by the ${actor}: ${finalReason}. Stock has been restored.`]
    );

    // A buyer cancellation must remain visible to the seller after cancelled
    // orders leave the regular orders list.
    if (accountType === "business") {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_CANCELLED_BY_BUYER', 'Order Cancelled', ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [order.farmer_id, order.id, `${order.buyerName} cancelled Order #${order.id} (${order.productName}). Reason: ${finalReason}`]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return res.json({ message: "Order cancelled successfully. Stock has been restored." });
  } catch (error) {
    console.error("Cancel order error:", error);
    if (connection && transactionStarted) await connection.rollback();
    return res.status(500).json({ message: "Could not cancel order." });
  } finally {
    if (connection) connection.release();
  }
};

export const getOrderNotifications = async (req, res) => {
  try {
    if (req.user.accountType !== "farmer") return res.json([]);
    const [notifications] = await pool.execute(
      `SELECT id, order_id AS orderId, type, title, message,
              is_read AS isRead, created_at AS createdAt
       FROM order_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`, [req.user.id]
    );
    return res.json(notifications);
  } catch (error) {
    console.error("Get order notifications error:", error);
    return res.status(500).json({ message: "Could not load notifications." });
  }
};

export const markOrderNotificationRead = async (req, res) => {
  try {
    if (req.user.accountType !== "farmer") return res.status(403).json({ message: "Farmer access required." });
    const notificationId = Number(req.params.notificationId);
    if (!Number.isInteger(notificationId) || notificationId <= 0) return res.status(400).json({ message: "Invalid notification ID." });
    const [result] = await pool.execute(
      "UPDATE order_notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notificationId, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Notification not found." });
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Could not update notification." });
  }
};

export const addDeliveryLocation = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const farmerId = req.user.id;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const note =
      typeof req.body.note === "string" && req.body.note.trim()
        ? req.body.note.trim().slice(0, 255)
        : "Farmer shared the current delivery location.";

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "A valid delivery location is required.",
      });
    }

    const [orders] = await pool.execute(
      `SELECT id, status
       FROM orders
       WHERE id = ? AND farmer_id = ?`,
      [orderId, farmerId]
    );

    const order = orders[0];

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.status !== "Out for Delivery") {
      return res.status(400).json({
        message: "Location can be updated only when the order is out for delivery.",
      });
    }

    await pool.execute(
      `INSERT INTO order_delivery_locations
        (order_id, latitude, longitude, note)
       VALUES (?, ?, ?, ?)`,
      [orderId, latitude, longitude, note]
    );

    return res.status(201).json({
      message: "Delivery location updated successfully.",
    });
  } catch (error) {
    console.error("Add delivery location error:", error);

    return res.status(500).json({
      message: "Could not update delivery location.",
    });
  }
};
