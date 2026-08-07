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

    // COD orders can go directly to farmer approval.
    // ONLINE orders wait until payment is verified.
    const initialStatus =
      paymentMethod === "ONLINE" ? "Awaiting Payment" : "Pending";

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
          : "Cash on delivery order created.",
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
          : "Cash on delivery order created successfully.",
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
          b.name AS businessName
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users b ON o.business_id = b.id
        WHERE o.farmer_id = ?
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
          f.name AS farmerName
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users f ON o.farmer_id = f.id
        WHERE o.business_id = ?
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
        id,
        status,
        payment_method AS paymentMethod,
        payment_status AS paymentStatus,
        tracking_code AS trackingCode,
        delivery_name AS deliveryName,
        delivery_phone AS deliveryPhone,
        delivery_address AS deliveryAddress
      FROM orders
      WHERE id = ? AND ${ownershipColumn} = ?`,
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
