import pool from "../config/db.js";

const isGujarat = (state) =>
  typeof state === "string" && state.trim().toLowerCase() === "gujarat";

// Helper function to calculate wholesale bulk tiered price:
export const calculateTierPricing = (basePrice, quantity, product = {}) => {
  const qty = Number(quantity) || 1;
  const price = Number(basePrice) || 0;
  const tier1Min = Number(product.tier1_min_qty ?? product.tier1MinQty ?? 51);
  const tier1Pct = Number(product.tier1_discount_pct ?? product.tier1DiscountPct ?? 10);
  const tier2Min = Number(product.tier2_min_qty ?? product.tier2MinQty ?? 201);
  const tier2Pct = Number(product.tier2_discount_pct ?? product.tier2DiscountPct ?? 20);

  let discountPct = 0;
  if (qty >= tier2Min && tier2Pct > 0) {
    discountPct = tier2Pct;
  } else if (qty >= tier1Min && tier1Pct > 0) {
    discountPct = tier1Pct;
  }

  const originalTotal = price * qty;
  const discountedUnitPrice = price * (1 - discountPct / 100);
  const total = originalTotal * (1 - discountPct / 100);
  const discountAmount = originalTotal - total;

  return {
    basePrice: price,
    quantity: qty,
    discountPct,
    discountAmount: Math.round(discountAmount * 100) / 100,
    unitPrice: Math.round(discountedUnitPrice * 100) / 100,
    originalTotal: Math.round(originalTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

// Business buyer creates an order.
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

    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
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

    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Payment method must be COD or ONLINE.",
      });
    }

    const businessId = req.user.id;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the product row and fetch tier discount info
    const [products] = await connection.execute(
      `SELECT
        id,
        farmer_id,
        quantity,
        price,
        unit,
        COALESCE(tier1_min_qty, 51) AS tier1_min_qty,
        COALESCE(tier1_discount_pct, 10) AS tier1_discount_pct,
        COALESCE(tier2_min_qty, 201) AS tier2_min_qty,
        COALESCE(tier2_discount_pct, 20) AS tier2_discount_pct
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

    if (!isGujarat(address.state)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        message: "Orders can currently be delivered only to addresses in Gujarat.",
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

    // Calculate wholesale bulk tiered price:
    const pricing = calculateTierPricing(product.price, requestedQuantity, product);

    const initialStatus =
      paymentMethod === "ONLINE" ? "Awaiting Payment" : "Accepted";

    const initialPaymentStatus = "PENDING";

    // Create the order with wholesale discount tracking:
    const [result] = await connection.execute(
      `INSERT INTO orders
      (
        product_id,
        business_id,
        farmer_id,
        quantity,
        unit_price,
        total,
        discount_amount,
        discount_pct,
        original_total,
        status,
        delivery_address_id,
        delivery_name,
        delivery_phone,
        delivery_address,
        payment_method,
        payment_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        businessId,
        product.farmer_id,
        requestedQuantity,
        pricing.unitPrice,
        pricing.total,
        pricing.discountAmount,
        pricing.discountPct,
        pricing.originalTotal,
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
      total: pricing.total,
      discountAmount: pricing.discountAmount,
      discountPct: pricing.discountPct,
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
          COALESCE(o.discount_amount, 0) AS discountAmount,
          COALESCE(o.discount_pct, 0) AS discountPct,
          COALESCE(o.original_total, o.total) AS originalTotal,
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
          p.unit AS productUnit,
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
          COALESCE(o.discount_amount, 0) AS discountAmount,
          COALESCE(o.discount_pct, 0) AS discountPct,
          COALESCE(o.original_total, o.total) AS originalTotal,
          o.status,
          o.payment_method AS paymentMethod,
          o.payment_status AS paymentStatus,
          o.tracking_code AS trackingCode,
          o.delivery_otp AS deliveryOtp,
          o.created_at AS createdAt,
          p.name AS productName,
          p.category AS productCategory,
          p.unit AS productUnit,
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

// Creates all cart items atomically.
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
    if (!isGujarat(address.state)) {
      throw Object.assign(
        new Error("Orders can currently be delivered only to addresses in Gujarat."),
        { status: 400 }
      );
    }
    const fullAddress = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
    const createdOrders = [];

    for (const item of items) {
      const productId = Number(item.productId), quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error("Every cart item needs a valid quantity."), { status: 400 });
      const [products] = await connection.execute(
        `SELECT id, farmer_id, quantity, price, unit,
                COALESCE(tier1_min_qty, 51) AS tier1_min_qty,
                COALESCE(tier1_discount_pct, 10) AS tier1_discount_pct,
                COALESCE(tier2_min_qty, 201) AS tier2_min_qty,
                COALESCE(tier2_discount_pct, 20) AS tier2_discount_pct
         FROM products WHERE id = ? FOR UPDATE`,
        [productId]
      );
      const product = products[0];
      if (!product) throw Object.assign(new Error("A cart product is no longer available."), { status: 404 });
      if (Number(product.quantity) < quantity) throw Object.assign(new Error("One or more cart quantities are no longer available."), { status: 400 });
      
      const pricing = calculateTierPricing(product.price, quantity, product);
      const status = paymentMethod === 'ONLINE' ? 'Awaiting Payment' : 'Accepted';
      const [result] = await connection.execute(
        `INSERT INTO orders (product_id, business_id, farmer_id, quantity, unit_price, total, discount_amount, discount_pct, original_total, status, delivery_address_id, delivery_name, delivery_phone, delivery_address, payment_method, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [productId, req.user.id, product.farmer_id, quantity, pricing.unitPrice, pricing.total, pricing.discountAmount, pricing.discountPct, pricing.originalTotal, status, address.id, address.recipient_name, address.phone, fullAddress, paymentMethod]
      );
      const orderId = result.insertId, trackingCode = `FL-${String(orderId).padStart(8, '0')}`;
      await connection.execute("UPDATE orders SET tracking_code = ? WHERE id = ?", [trackingCode, orderId]);
      await connection.execute("INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)", [orderId, status, paymentMethod === 'ONLINE' ? 'Waiting for online payment.' : 'Order accepted automatically because stock is available.']);
      await connection.execute("UPDATE products SET quantity = quantity - ? WHERE id = ?", [quantity, productId]);
      createdOrders.push({ orderId, total: pricing.total, discountAmount: pricing.discountAmount, discountPct: pricing.discountPct });
    }
    await connection.commit();
    return res.status(201).json({ message: "Cart order placed successfully.", orders: createdOrders, total: createdOrders.reduce((sum, order) => sum + order.total, 0) });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Could not place cart order." });
  } finally { if (connection) connection.release(); }
};

// Small aggregate endpoint for dashboard cards.
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

    const [orders] = await pool.execute(
      `SELECT
        o.id,
        o.status,
        o.total,
        o.quantity,
        o.unit_price AS unitPrice,
        COALESCE(o.discount_amount, 0) AS discountAmount,
        COALESCE(o.discount_pct, 0) AS discountPct,
        COALESCE(o.original_total, o.total) AS originalTotal,
        o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus,
        o.tracking_code AS trackingCode,
        o.delivery_name AS deliveryName,
        o.delivery_phone AS deliveryPhone,
        o.delivery_address AS deliveryAddress,
        o.delivery_otp AS deliveryOtp,
        p.name AS productName,
        p.unit AS productUnit,
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

    if (accountType === "business") {
      // If the order is Out for Delivery but no OTP is stored yet, generate and persist one.
      if (order.status === "Out for Delivery" && !order.deliveryOtp) {
        const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
        await pool.execute("UPDATE orders SET delivery_otp = ? WHERE id = ?", [generatedOtp, order.id]);
        order.deliveryOtp = generatedOtp;
      }
    } else {
      // Never expose the OTP to the farmer or driver
      delete order.deliveryOtp;
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
    const { status, note, trackingCode, otp } = req.body;
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
        business_id,
        quantity,
        status,
        payment_method,
        payment_status,
        delivery_otp
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

    // If marking as Delivered, verify the 4-digit Delivery Confirmation OTP
    if (status === "Delivered") {
      const submittedOtp = typeof otp === "string" || typeof otp === "number" ? String(otp).trim() : "";
      const expectedOtp = order.delivery_otp ? String(order.delivery_otp).trim() : "";

      if (!expectedOtp || submittedOtp !== expectedOtp) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(400).json({
          message: "Invalid Delivery Confirmation OTP. Please enter the 4-digit OTP provided by the buyer.",
        });
      }
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
    const cleanTrackingCode =
      typeof trackingCode === "string" && trackingCode.trim()
        ? trackingCode.trim()
        : null;

    // If transitioning to "Out for Delivery", ensure 4-digit OTP exists
    let activeOtp = order.delivery_otp;
    if (status === "Out for Delivery") {
      if (!activeOtp) {
        activeOtp = String(Math.floor(1000 + Math.random() * 9000));
      }
    }

    await connection.execute(
      `UPDATE orders
       SET
         status = ?,
         payment_status = ?,
         tracking_code = COALESCE(?, tracking_code),
         delivery_otp = ?
       WHERE id = ?`,
      [status, nextPaymentStatus, cleanTrackingCode, activeOtp, orderId]
    );

    const cleanNote =
      typeof note === "string" && note.trim()
        ? note.trim()
        : status === "Out for Delivery"
          ? "Your order is on the way."
          : status === "Delivered"
            ? "Order delivered successfully. Verified with confirmation OTP."
            : `Order status changed to ${status}.`;

    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note)
       VALUES (?, ?, ?)`,
      [orderId, status, cleanNote]
    );

    // If order goes Out for Delivery or Delivered, notify the buyer
    if (status === "Out for Delivery") {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_OUT_FOR_DELIVERY', 'Order Out for Delivery', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} is out for delivery! Your Delivery Confirmation OTP is ${activeOtp}. Please share this OTP with the driver upon delivery.`
        ]
      );
    } else if (status === "Delivered") {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_DELIVERED', 'Order Delivered', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} has been successfully delivered and verified with OTP confirmation.`
        ]
      );
    }

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
      message: error.message || "Could not update order status.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// A buyer or farmer can cancel an order while it has not yet left for delivery.
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
      `SELECT o.id, o.product_id, o.business_id, o.farmer_id, o.quantity, o.status,
              o.payment_method, o.payment_status,
              p.name AS productName, b.name AS buyerName, f.name AS farmerName
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.business_id
       JOIN users f ON f.id = o.farmer_id
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

    const paymentStatus = String(order.payment_status || "").toUpperCase();
    const hasSuccessfulOnlinePayment =
      order.payment_method === "ONLINE" &&
      ["PAID", "SUCCESS"].includes(paymentStatus);

    if (hasSuccessfulOnlinePayment) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({
        message: "This order has been paid online and cannot be cancelled.",
      });
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

    const cancelledByBuyer = accountType === "business";
    const notificationUserId = cancelledByBuyer ? order.farmer_id : order.business_id;
    const cancellingUserName = cancelledByBuyer ? order.buyerName : order.farmerName;
    const notificationType = cancelledByBuyer
      ? "ORDER_CANCELLED_BY_BUYER"
      : "ORDER_CANCELLED_BY_FARMER";
    await connection.execute(
      `INSERT INTO order_notifications (user_id, order_id, type, title, message)
       VALUES (?, ?, ?, 'Order Cancelled', ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [notificationUserId, order.id, notificationType, `${cancellingUserName} cancelled Order #${order.id} (${order.productName}). Reason: ${finalReason}`]
    );

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
