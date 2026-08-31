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

// Business buyer creates an order for a single product (Buy Now flow)
export const placeOrder = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const productId = Number(req.body.productId);
    const requestedQuantity = Number(req.body.quantity);
    const addressId = Number(req.body.addressId);
    const paymentMethod = req.body.paymentMethod;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: "A valid product is required." });
    }
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive whole number." });
    }
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({ message: "Please select a delivery address." });
    }
    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be COD or ONLINE." });
    }

    const businessId = req.user.id;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [products] = await connection.execute(
      `SELECT p_id AS id, farmer_id, quantity, price, unit,
              COALESCE(tier1_min_qty, 51) AS tier1_min_qty,
              COALESCE(tier1_discount_pct, 10) AS tier1_discount_pct,
              COALESCE(tier2_min_qty, 201) AS tier2_min_qty,
              COALESCE(tier2_discount_pct, 20) AS tier2_discount_pct
       FROM products WHERE p_id = ? FOR UPDATE`,
      [productId]
    );
    const product = products[0];
    if (!product) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found." });
    }
    if (Number(product.quantity) < requestedQuantity) {
      await connection.rollback();
      return res.status(400).json({ message: "Requested quantity is not available." });
    }

    const [addresses] = await connection.execute(
      `SELECT da_id AS id, recipient_name, phone, address_line1, address_line2, city, state, pincode
       FROM delivery_addresses WHERE da_id = ? AND business_id = ?`,
      [addressId, businessId]
    );
    const address = addresses[0];
    if (!address) {
      await connection.rollback();
      return res.status(404).json({ message: "Delivery address not found." });
    }
    if (!isGujarat(address.state)) {
      await connection.rollback();
      return res.status(400).json({ message: "Orders can currently be delivered only to addresses in Gujarat." });
    }

    const fullAddress = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
    const pricing = calculateTierPricing(product.price, requestedQuantity, product);
    const initialStatus = paymentMethod === "ONLINE" ? "Awaiting Payment" : "Accepted";

    const [result] = await connection.execute(
      `INSERT INTO orders (
        business_id, total,
        status, delivery_address_id, delivery_name, delivery_phone, delivery_address,
        payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        businessId,
        pricing.total,
        initialStatus,
        address.id,
        address.recipient_name,
        address.phone,
        fullAddress,
        paymentMethod,
      ]
    );

    const orderId = result.insertId;
    const trackingCode = `FL-${String(orderId).padStart(8, "0")}`;
    await connection.execute("UPDATE orders SET tracking_code = ? WHERE o_id = ?", [trackingCode, orderId]);

    // Insert payment record into dedicated payments table
    await connection.execute(
      `INSERT INTO payments (
        order_id, amount, payment_method, payment_status
      ) VALUES (?, ?, ?, 'PENDING')`,
      [orderId, pricing.total, paymentMethod]
    );

    await connection.execute(
      `INSERT INTO order_items (
        order_id, product_id, farmer_id, quantity, unit_price,
        discount_amount, discount_pct, original_total, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        productId,
        product.farmer_id,
        requestedQuantity,
        pricing.unitPrice,
        pricing.discountAmount,
        pricing.discountPct,
        pricing.originalTotal,
        pricing.total,
        initialStatus,
      ]
    );

    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [
        orderId,
        initialStatus,
        paymentMethod === "ONLINE"
          ? "Waiting for online payment."
          : "Order accepted automatically because stock is available.",
      ]
    );

    await connection.execute("UPDATE products SET quantity = quantity - ? WHERE p_id = ?", [requestedQuantity, productId]);

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: paymentMethod === "ONLINE"
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
    if (connection && transactionStarted) await connection.rollback();
    return res.status(500).json({ message: "Could not place order." });
  } finally {
    if (connection) connection.release();
  }
};

// Creates all cart items atomically under ONE main order
export const placeCartOrder = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const { items, addressId: rawAddressId, paymentMethod } = req.body;
    const addressId = Number(rawAddressId);
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({ message: "Please select a delivery address." });
    }
    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be COD or ONLINE." });
    }

    const businessId = req.user.id;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [addresses] = await connection.execute(
      `SELECT da_id AS id, recipient_name, phone, address_line1, address_line2, city, state, pincode
       FROM delivery_addresses WHERE da_id = ? AND business_id = ?`,
      [addressId, businessId]
    );
    const address = addresses[0];
    if (!address) {
      await connection.rollback();
      return res.status(404).json({ message: "Delivery address not found." });
    }
    if (!isGujarat(address.state)) {
      await connection.rollback();
      return res.status(400).json({ message: "Orders can currently be delivered only to addresses in Gujarat." });
    }

    const fullAddress = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");

    let grandTotal = 0;
    let grandDiscountAmount = 0;
    let grandOriginalTotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
        await connection.rollback();
        return res.status(400).json({ message: "Every cart item needs a valid quantity." });
      }

      const [products] = await connection.execute(
        `SELECT p_id AS id, farmer_id, quantity, price, unit,
                COALESCE(tier1_min_qty, 51) AS tier1_min_qty,
                COALESCE(tier1_discount_pct, 10) AS tier1_discount_pct,
                COALESCE(tier2_min_qty, 201) AS tier2_min_qty,
                COALESCE(tier2_discount_pct, 20) AS tier2_discount_pct
         FROM products WHERE p_id = ? FOR UPDATE`,
        [productId]
      );
      const product = products[0];
      if (!product) {
        await connection.rollback();
        return res.status(404).json({ message: `A cart product (ID: ${productId}) is no longer available.` });
      }
      if (Number(product.quantity) < quantity) {
        await connection.rollback();
        return res.status(400).json({ message: `One or more cart quantities exceed available stock.` });
      }

      const pricing = calculateTierPricing(product.price, quantity, product);
      grandTotal += pricing.total;
      grandDiscountAmount += pricing.discountAmount;
      grandOriginalTotal += pricing.originalTotal;

      preparedItems.push({
        productId,
        farmerId: product.farmer_id,
        quantity,
        pricing,
      });
    }

    grandTotal = Math.round(grandTotal * 100) / 100;
    grandDiscountAmount = Math.round(grandDiscountAmount * 100) / 100;
    grandOriginalTotal = Math.round(grandOriginalTotal * 100) / 100;

    const initialStatus = paymentMethod === "ONLINE" ? "Awaiting Payment" : "Accepted";

    // Insert ONE main order record for this entire checkout
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        business_id, total,
        status, delivery_address_id, delivery_name, delivery_phone, delivery_address,
        payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        businessId,
        grandTotal,
        initialStatus,
        address.id,
        address.recipient_name,
        address.phone,
        fullAddress,
        paymentMethod,
      ]
    );

    const orderId = orderResult.insertId;
    const trackingCode = `FL-${String(orderId).padStart(8, "0")}`;
    await connection.execute("UPDATE orders SET tracking_code = ? WHERE o_id = ?", [trackingCode, orderId]);

    // Insert payment record into dedicated payments table
    await connection.execute(
      `INSERT INTO payments (
        order_id, amount, payment_method, payment_status
      ) VALUES (?, ?, ?, 'PENDING')`,
      [orderId, grandTotal, paymentMethod]
    );

    // Insert OrderItem records for each item in the cart
    for (const item of preparedItems) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, farmer_id, quantity, unit_price,
          discount_amount, discount_pct, original_total, total, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.farmerId,
          item.quantity,
          item.pricing.unitPrice,
          item.pricing.discountAmount,
          item.pricing.discountPct,
          item.pricing.originalTotal,
          item.pricing.total,
          initialStatus,
        ]
      );

      // Decrement stock
      await connection.execute("UPDATE products SET quantity = quantity - ? WHERE p_id = ?", [item.quantity, item.productId]);
    }

    // Add initial tracking event
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [
        orderId,
        initialStatus,
        paymentMethod === "ONLINE"
          ? "Waiting for online payment."
          : "Order accepted automatically because stock is available.",
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: paymentMethod === "ONLINE"
        ? "Order created. Complete online payment."
        : "Cart order placed successfully.",
      orderId,
      trackingCode,
      status: initialStatus,
      paymentMethod,
      total: grandTotal,
      originalTotal: grandOriginalTotal,
      discountAmount: grandDiscountAmount,
      itemsCount: preparedItems.length,
      orders: [{ orderId, total: grandTotal, discountAmount: grandDiscountAmount }],
    });
  } catch (error) {
    console.error("Place cart order error:", error);
    if (connection && transactionStarted) await connection.rollback();
    return res.status(500).json({ message: "Could not place cart order." });
  } finally {
    if (connection) connection.release();
  }
};

// Farmer sees received orders with their items grouped.
// Business buyer sees placed orders with all items grouped.
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = req.user.accountType;

    if (accountType === "farmer") {
      // Find all distinct orders that have items belonging to this farmer
      const [orders] = await pool.execute(
        `SELECT DISTINCT
           o.o_id AS id,
           o.status,
           o.payment_method AS paymentMethod,
           o.payment_status AS paymentStatus,
           o.tracking_code AS trackingCode,
           o.delivery_name AS deliveryName,
           o.delivery_phone AS deliveryPhone,
           o.delivery_address AS deliveryAddress,
           o.created_at AS createdAt,
           b.name AS businessName,
           b.email AS businessEmail
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.o_id
         JOIN users b ON o.business_id = b.u_id
         WHERE oi.farmer_id = ? AND o.status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')
         ORDER BY o.created_at DESC, o.o_id DESC`,
        [userId]
      );

      if (orders.length === 0) {
        return res.json([]);
      }

      const orderIds = orders.map((o) => o.id);
      const placeholders = orderIds.map(() => "?").join(",");

      // Fetch items for these orders belonging to this farmer
      const [items] = await pool.execute(
        `SELECT
           oi.oi_id AS id,
           oi.order_id AS orderId,
           oi.product_id AS productId,
           oi.quantity,
           oi.unit_price AS unitPrice,
           oi.total,
           COALESCE(oi.discount_amount, 0) AS discountAmount,
           COALESCE(oi.discount_pct, 0) AS discountPct,
           COALESCE(oi.original_total, oi.total) AS originalTotal,
           oi.status,
           p.name AS productName,
           p.category AS productCategory,
           p.unit AS productUnit,
           p.image_url AS productImage
         FROM order_items oi
         JOIN products p ON oi.product_id = p.p_id
         WHERE oi.farmer_id = ? AND oi.order_id IN (${placeholders})
         ORDER BY oi.oi_id ASC`,
        [userId, ...orderIds]
      );

      const itemsByOrder = new Map();
      for (const item of items) {
        if (!itemsByOrder.has(item.orderId)) {
          itemsByOrder.set(item.orderId, []);
        }
        itemsByOrder.get(item.orderId).push(item);
      }

      const results = orders.map((order) => {
        const orderItems = itemsByOrder.get(order.id) || [];
        const farmerSubtotal = orderItems.reduce((sum, it) => sum + Number(it.total || 0), 0);
        const farmerDiscount = orderItems.reduce((sum, it) => sum + Number(it.discountAmount || 0), 0);
        const farmerOriginalTotal = orderItems.reduce((sum, it) => sum + Number(it.originalTotal || it.total || 0), 0);
        const farmerTotalQty = orderItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

        return {
          id: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          trackingCode: order.trackingCode,
          deliveryName: order.deliveryName,
          deliveryPhone: order.deliveryPhone,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt,
          businessName: order.businessName,
          businessEmail: order.businessEmail,
          items: orderItems,
          total: Math.round(farmerSubtotal * 100) / 100,
          discountAmount: Math.round(farmerDiscount * 100) / 100,
          originalTotal: Math.round(farmerOriginalTotal * 100) / 100,
          quantity: farmerTotalQty,
          // Legacy fields for backward compatibility
          productName: orderItems.map((i) => i.productName).join(", "),
          productCategory: orderItems[0]?.productCategory || "Produce",
          productUnit: orderItems[0]?.productUnit || "kg",
          unitPrice: orderItems[0]?.unitPrice || 0,
        };
      });

      return res.json(results);
    } else if (accountType === "business") {
      const [orders] = await pool.execute(
        `SELECT
           o.o_id AS id,
           o.total,
           o.status,
           o.payment_method AS paymentMethod,
           o.payment_status AS paymentStatus,
           o.tracking_code AS trackingCode,
           o.delivery_otp AS deliveryOtp,
           o.delivery_name AS deliveryName,
           o.delivery_phone AS deliveryPhone,
           o.delivery_address AS deliveryAddress,
           o.created_at AS createdAt
         FROM orders o
         WHERE o.business_id = ? AND o.status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')
         ORDER BY o.created_at DESC, o.o_id DESC`,
        [userId]
      );

      if (orders.length === 0) {
        return res.json([]);
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
           COALESCE(oi.discount_amount, 0) AS discountAmount,
           COALESCE(oi.discount_pct, 0) AS discountPct,
           COALESCE(oi.original_total, oi.total) AS originalTotal,
           oi.status,
           p.name AS productName,
           p.category AS productCategory,
           p.unit AS productUnit,
           p.image_url AS productImage,
           f.name AS farmerName
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

      const results = orders.map((order) => {
        const orderItems = itemsByOrder.get(order.id) || [];
        const totalQty = orderItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        const orderDiscount = orderItems.reduce((sum, it) => sum + Number(it.discountAmount || 0), 0);
        const orderOriginalTotal = orderItems.reduce((sum, it) => sum + Number(it.originalTotal || it.total || 0), 0);
        const farmersList = Array.from(new Set(orderItems.map((it) => it.farmerName).filter(Boolean))).join(", ");

        return {
          id: order.id,
          total: Number(order.total),
          discountAmount: Math.round(orderDiscount * 100) / 100,
          discountPct: orderOriginalTotal > 0 ? Math.round((orderDiscount / orderOriginalTotal) * 100) : 0,
          originalTotal: Math.round(orderOriginalTotal * 100) / 100,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          trackingCode: order.trackingCode,
          deliveryOtp: order.deliveryOtp,
          deliveryName: order.deliveryName,
          deliveryPhone: order.deliveryPhone,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt,
          items: orderItems,
          quantity: totalQty,
          // Legacy fields for backward compatibility
          farmerName: farmersList || "Farmer",
          productName: orderItems.map((i) => i.productName).join(", "),
          productCategory: orderItems[0]?.productCategory || "Produce",
          productUnit: orderItems[0]?.productUnit || "kg",
          unitPrice: orderItems[0]?.unitPrice || 0,
        };
      });

      return res.json(results);
    } else {
      return res.status(403).json({ message: "You cannot view these orders." });
    }
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ message: "Could not get orders." });
  }
};

// Aggregate endpoint for dashboard cards
export const getOrderSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = req.user.accountType;

    if (accountType === "farmer") {
      const [rows] = await pool.execute(
        `SELECT
           COUNT(DISTINCT o.o_id) AS totalOrders,
           COUNT(DISTINCT CASE WHEN o.status = 'Delivered' THEN o.o_id END) AS completedOrders,
           COALESCE(SUM(CASE WHEN o.status = 'Delivered' THEN oi.total ELSE 0 END), 0) AS completedTotal
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.o_id
         WHERE oi.farmer_id = ? AND o.status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')`,
        [userId]
      );
      const summary = rows[0];
      return res.json({
        totalOrders: Number(summary.totalOrders || 0),
        completedOrders: Number(summary.completedOrders || 0),
        completedTotal: Number(summary.completedTotal || 0),
      });
    } else if (accountType === "business") {
      const [rows] = await pool.execute(
        `SELECT
           COUNT(*) AS totalOrders,
           COALESCE(SUM(status = 'Delivered'), 0) AS completedOrders,
           COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total ELSE 0 END), 0) AS completedTotal
         FROM orders
         WHERE business_id = ? AND status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER')`,
        [userId]
      );
      const summary = rows[0];
      return res.json({
        totalOrders: Number(summary.totalOrders || 0),
        completedOrders: Number(summary.completedOrders || 0),
        completedTotal: Number(summary.completedTotal || 0),
      });
    } else {
      return res.status(403).json({ message: "You cannot view order statistics." });
    }
  } catch (error) {
    console.error("Get order summary error:", error);
    return res.status(500).json({ message: "Could not load order statistics." });
  }
};

// Returns tracking timeline to the farmer or buyer who owns the order
export const getOrderTracking = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;
    const accountType = req.user.accountType;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    let ownershipCheckQuery;
    let ownershipCheckParams;

    if (accountType === "farmer") {
      ownershipCheckQuery = `
        SELECT o.o_id AS id FROM orders o
        JOIN order_items oi ON oi.order_id = o.o_id
        WHERE o.o_id = ? AND oi.farmer_id = ?
        LIMIT 1
      `;
      ownershipCheckParams = [orderId, userId];
    } else if (accountType === "business") {
      ownershipCheckQuery = `
        SELECT o.o_id AS id FROM orders o
        WHERE o.o_id = ? AND o.business_id = ?
        LIMIT 1
      `;
      ownershipCheckParams = [orderId, userId];
    } else {
      return res.status(403).json({ message: "You cannot view this order." });
    }

    const [check] = await pool.execute(ownershipCheckQuery, ownershipCheckParams);
    if (check.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Get order record
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
         o.delivery_otp AS deliveryOtp,
         o.created_at AS createdAt
       FROM orders o
       WHERE o.o_id = ?`,
      [orderId]
    );
    const order = orders[0];

    // Fetch items for this order (filtered by farmer if farmer, or all items if buyer)
    let itemsQuery;
    let itemsParams;
    if (accountType === "farmer") {
      itemsQuery = `
        SELECT
          oi.oi_id AS id,
          oi.product_id AS productId,
          oi.quantity,
          oi.unit_price AS unitPrice,
          oi.total,
          oi.status,
          p.name AS productName,
          p.unit AS productUnit,
          p.location AS farmLocation,
          p.image_url AS productImage
        FROM order_items oi
        JOIN products p ON oi.product_id = p.p_id
        WHERE oi.order_id = ? AND oi.farmer_id = ?
        ORDER BY oi.oi_id ASC
      `;
      itemsParams = [orderId, userId];
    } else {
      itemsQuery = `
        SELECT
          oi.oi_id AS id,
          oi.product_id AS productId,
          oi.farmer_id AS farmerId,
          oi.quantity,
          oi.unit_price AS unitPrice,
          oi.total,
          oi.status,
          p.name AS productName,
          p.unit AS productUnit,
          p.location AS farmLocation,
          p.image_url AS productImage,
          f.name AS farmerName
        FROM order_items oi
        JOIN products p ON oi.product_id = p.p_id
        JOIN users f ON oi.farmer_id = f.u_id
        WHERE oi.order_id = ?
        ORDER BY oi.oi_id ASC
      `;
      itemsParams = [orderId];
    }

    const [items] = await pool.execute(itemsQuery, itemsParams);

    // Provide fields on order object
    order.items = items;
    order.productName = items.map((i) => i.productName).join(", ");
    order.productUnit = items[0]?.productUnit || "kg";
    order.farmLocation = items[0]?.farmLocation || "";
    order.quantity = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    if (accountType === "business") {
      if (order.status === "Out for Delivery" && !order.deliveryOtp) {
        const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
        await pool.execute("UPDATE orders SET delivery_otp = ? WHERE o_id = ?", [generatedOtp, order.id]);
        order.deliveryOtp = generatedOtp;
      }
    } else {
      delete order.deliveryOtp;
    }

    const [events] = await pool.execute(
      `SELECT ote_id AS id, status, note, created_at AS createdAt
       FROM order_tracking_events
       WHERE order_id = ?
       ORDER BY created_at ASC, ote_id ASC`,
      [orderId]
    );

    const [locations] = await pool.execute(
      `SELECT odl_id AS id, latitude, longitude, note, created_at AS createdAt
       FROM order_delivery_locations
       WHERE order_id = ?
       ORDER BY created_at DESC`,
      [orderId]
    );

    return res.json({
      order,
      items,
      events,
      latestLocation: locations[0] || null,
      locations,
    });
  } catch (error) {
    console.error("Get order tracking error:", error);
    return res.status(500).json({ message: "Could not get order tracking." });
  }
};

// Farmer changes delivery/order status
export const updateOrderStatus = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const orderId = Number(req.params.id);
    const { status, note, trackingCode, otp } = req.body;
    const farmerId = req.user.id;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const validStatuses = ["Accepted", "Out for Delivery", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Check order and verify farmer has items in this order
    const [orders] = await connection.execute(
      `SELECT o.o_id AS id, o.business_id, o.status, o.payment_method, o.payment_status, o.delivery_otp
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.o_id
       WHERE o.o_id = ? AND oi.farmer_id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId, farmerId]
    );
    const order = orders[0];
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found or you cannot manage it." });
    }

    const allowedChanges = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Out for Delivery", "Cancelled"],
      "Out for Delivery": ["Delivered"],
    };

    if (!allowedChanges[order.status]?.includes(status)) {
      await connection.rollback();
      return res.status(400).json({ message: `Cannot change ${order.status} order to ${status}.` });
    }

    if (status === "Delivered") {
      const submittedOtp = typeof otp === "string" || typeof otp === "number" ? String(otp).trim() : "";
      const expectedOtp = order.delivery_otp ? String(order.delivery_otp).trim() : "";
      if (!expectedOtp || submittedOtp !== expectedOtp) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid Delivery Confirmation OTP. Please enter the 4-digit OTP provided by the buyer.",
        });
      }
    }

    // If farmer cancels, restore stock for farmer's items in this order
    if (status === "Cancelled") {
      const [farmerItems] = await connection.execute(
        `SELECT product_id, quantity FROM order_items WHERE order_id = ? AND farmer_id = ?`,
        [orderId, farmerId]
      );
      for (const item of farmerItems) {
        await connection.execute(
          `UPDATE products SET quantity = quantity + ? WHERE p_id = ?`,
          [item.quantity, item.product_id]
        );
      }
    }

    const nextPaymentStatus =
      status === "Delivered" && order.payment_method === "COD"
        ? "PAID"
        : order.payment_status;

    let activeOtp = order.delivery_otp;
    if (status === "Out for Delivery" && !activeOtp) {
      activeOtp = String(Math.floor(1000 + Math.random() * 9000));
    }

    const cleanTrackingCode =
      typeof trackingCode === "string" && trackingCode.trim()
        ? trackingCode.trim()
        : null;

    // Update order items for this farmer
    await connection.execute(
      `UPDATE order_items SET status = ? WHERE order_id = ? AND farmer_id = ?`,
      [status, orderId, farmerId]
    );

    // Update main order
    await connection.execute(
      `UPDATE orders
       SET status = ?, payment_status = ?, tracking_code = COALESCE(?, tracking_code), delivery_otp = ?
       WHERE o_id = ?`,
      [status, nextPaymentStatus, cleanTrackingCode, activeOtp, orderId]
    );

    // Update payments table status if COD delivered
    if (status === "Delivered" && order.payment_method === "COD") {
      await connection.execute(
        `UPDATE payments SET payment_status = 'PAID' WHERE order_id = ?`,
        [orderId]
      );
    }

    const cleanNote =
      typeof note === "string" && note.trim()
        ? note.trim()
        : status === "Out for Delivery"
          ? "Your order is on the way."
          : status === "Delivered"
            ? "Order delivered successfully. Verified with confirmation OTP."
            : `Order status changed to ${status}.`;

    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [orderId, status, cleanNote]
    );

    if (status === "Out for Delivery") {
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_OUT_FOR_DELIVERY', 'Order Out for Delivery', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [
          order.business_id,
          orderId,
          `Your order #${orderId} is out for delivery! Your Delivery Confirmation OTP is ${activeOtp}. Please share this OTP with the driver upon delivery.`,
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
          `Your order #${orderId} has been successfully delivered and verified with OTP confirmation.`,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return res.json({ message: `Order ${status.toLowerCase()} successfully.` });
  } catch (error) {
    console.error("Update order status error:", error);
    if (connection && transactionStarted) await connection.rollback();
    return res.status(500).json({ message: error.message || "Could not update order status." });
  } finally {
    if (connection) connection.release();
  }
};

// A buyer or farmer can cancel an order while it has not yet left for delivery
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

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Fetch order
    const [orders] = await connection.execute(
      `SELECT o.o_id AS id, o.business_id, o.status, o.payment_method, o.payment_status,
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

    if (accountType === "business" && order.business_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ message: "You cannot cancel this order." });
    }

    const paymentStatus = String(order.payment_status || "").toUpperCase();
    const hasSuccessfulOnlinePayment = order.payment_method === "ONLINE" && ["PAID", "SUCCESS"].includes(paymentStatus);
    if (hasSuccessfulOnlinePayment) {
      await connection.rollback();
      return res.status(409).json({ message: "This order has been paid online and cannot be cancelled." });
    }

    const allowedStatuses = accountType === "farmer"
      ? ["Pending", "Accepted"]
      : ["Awaiting Payment", "Pending", "Accepted"];

    if (!allowedStatuses.includes(order.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: "This order can no longer be cancelled because delivery has started or it is already complete.",
      });
    }

    let itemsToRestore = [];
    if (accountType === "business") {
      const [items] = await connection.execute(
        `SELECT oi.oi_id AS id, oi.product_id, oi.farmer_id, oi.quantity, p.name AS productName, f.name AS farmerName
         FROM order_items oi
         JOIN products p ON p.p_id = oi.product_id
         JOIN users f ON f.u_id = oi.farmer_id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      itemsToRestore = items;
    } else {
      // Farmer cancellation
      const [items] = await connection.execute(
        `SELECT oi.oi_id AS id, oi.product_id, oi.farmer_id, oi.quantity, p.name AS productName, f.name AS farmerName
         FROM order_items oi
         JOIN products p ON p.p_id = oi.product_id
         JOIN users f ON f.u_id = oi.farmer_id
         WHERE oi.order_id = ? AND oi.farmer_id = ?`,
        [orderId, userId]
      );
      if (items.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "No items found in this order for your account." });
      }
      itemsToRestore = items;
    }

    // Restore stock
    for (const item of itemsToRestore) {
      await connection.execute(
        `UPDATE products SET quantity = quantity + ? WHERE p_id = ?`,
        [item.quantity, item.product_id]
      );
    }

    const cancelledStatus = accountType === "business" ? "CANCELLED_BY_BUYER" : "Cancelled";
    const actorRole = accountType === "farmer" ? "FARMER" : "BUYER";

    // Update order items
    if (accountType === "business") {
      await connection.execute(
        `UPDATE order_items SET status = ? WHERE order_id = ?`,
        [cancelledStatus, orderId]
      );
      await connection.execute(
        `UPDATE orders
         SET status = ?, cancelled_by_user_id = ?, cancelled_by_role = ?, cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP
         WHERE o_id = ?`,
        [cancelledStatus, userId, actorRole, finalReason, orderId]
      );
    } else {
      await connection.execute(
        `UPDATE order_items SET status = ? WHERE order_id = ? AND farmer_id = ?`,
        [cancelledStatus, orderId, userId]
      );
      // If all items are cancelled, mark orders as Cancelled
      const [activeItems] = await connection.execute(
        `SELECT 1 FROM order_items WHERE order_id = ? AND status NOT IN ('Cancelled', 'CANCELLED_BY_BUYER') LIMIT 1`,
        [orderId]
      );
      if (activeItems.length === 0) {
        await connection.execute(
          `UPDATE orders
           SET status = ?, cancelled_by_user_id = ?, cancelled_by_role = ?, cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP
           WHERE o_id = ?`,
          [cancelledStatus, userId, actorRole, finalReason, orderId]
        );
      }
    }

    const actor = accountType === "farmer" ? "seller" : "buyer";
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, note) VALUES (?, ?, ?)`,
      [orderId, cancelledStatus, `Order cancelled by the ${actor}: ${finalReason}. Stock has been restored.`]
    );

    // Send notifications
    if (accountType === "business") {
      const distinctFarmerIds = Array.from(new Set(itemsToRestore.map((i) => i.farmer_id)));
      for (const fId of distinctFarmerIds) {
        await connection.execute(
          `INSERT INTO order_notifications (user_id, order_id, type, title, message)
           VALUES (?, ?, 'ORDER_CANCELLED_BY_BUYER', 'Order Cancelled', ?)
           ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
          [fId, orderId, `${order.buyerName} cancelled Order #${orderId}. Reason: ${finalReason}`]
        );
      }
    } else {
      const farmerName = itemsToRestore[0]?.farmerName || "The farmer";
      await connection.execute(
        `INSERT INTO order_notifications (user_id, order_id, type, title, message)
         VALUES (?, ?, 'ORDER_CANCELLED_BY_FARMER', 'Order Cancelled', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = FALSE, created_at = CURRENT_TIMESTAMP`,
        [order.business_id, orderId, `${farmerName} cancelled Order #${orderId}. Reason: ${finalReason}`]
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
    const [notifications] = await pool.execute(
      `SELECT on_id AS id, order_id AS orderId, type, title, message,
              is_read AS isRead, created_at AS createdAt
       FROM order_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
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
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: "Invalid notification ID." });
    }
    const [result] = await pool.execute(
      "UPDATE order_notifications SET is_read = TRUE WHERE on_id = ? AND user_id = ?",
      [notificationId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Could not update notification." });
  }
};

export const deleteOrderNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.notificationId);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: "Invalid notification ID." });
    }
    const [result] = await pool.execute(
      "DELETE FROM order_notifications WHERE on_id = ? AND user_id = ?",
      [notificationId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    return res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({ message: "Could not delete notification." });
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
      return res.status(400).json({ message: "Invalid order ID." });
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ message: "A valid delivery location is required." });
    }

    const [orders] = await pool.execute(
      `SELECT o.o_id AS id, o.status
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.o_id
       WHERE o.o_id = ? AND oi.farmer_id = ?
       LIMIT 1`,
      [orderId, farmerId]
    );
    const order = orders[0];
    if (!order) {
      return res.status(404).json({ message: "Order not found or you cannot update its location." });
    }

    if (order.status !== "Out for Delivery") {
      return res.status(400).json({ message: "Location can be updated only when the order is out for delivery." });
    }

    await pool.execute(
      `INSERT INTO order_delivery_locations (order_id, latitude, longitude, note) VALUES (?, ?, ?, ?)`,
      [orderId, latitude, longitude, note]
    );

    return res.status(201).json({ message: "Delivery location updated successfully." });
  } catch (error) {
    console.error("Add delivery location error:", error);
    return res.status(500).json({ message: "Could not update delivery location." });
  }
};
