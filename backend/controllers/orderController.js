import pool from "../config/db.js";

// Business user places an order
export const placeOrder = async (req, res) => {
  let connection;

  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        message: "Valid product and quantity are required.",
      });
    }

    const businessId = req.user.id;

    // Get a database connection for transaction
    connection = await pool.getConnection();

    // Start transaction:
    // create order + reduce product quantity must happen together
    await connection.beginTransaction();

    // FOR UPDATE locks this product temporarily.
    // This prevents two buyers ordering the same stock at once.
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

      return res.status(404).json({
        message: "Product not found.",
      });
    }

    if (Number(product.quantity) < Number(quantity)) {
      await connection.rollback();

      return res.status(400).json({
        message: "Requested quantity is not available.",
      });
    }

    const total = Number(product.price) * Number(quantity);

    // Save order in orders table
    const [result] = await connection.execute(
      `INSERT INTO orders
      (product_id, business_id, farmer_id, quantity, unit_price, total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        businessId,
        product.farmer_id,
        quantity,
        product.price,
        total,
        "Pending",
      ]
    );

    // Decrease stock after buyer places order
    await connection.execute(
      "UPDATE products SET quantity = quantity - ? WHERE id = ?",
      [quantity, productId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully.",
      orderId: result.insertId,
    });
  } catch (error) {
    console.log("Place order error:", error);

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      message: "Could not place order.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Farmer sees orders received.
// Business sees orders they placed.
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountType = req.user.accountType;

    let query = "";
    let values = [];

    if (accountType === "farmer") {
      query = `
        SELECT
          o.id,
          o.quantity,
          o.unit_price AS unitPrice,
          o.total,
          o.status,
          o.created_at AS createdAt,
          p.name AS productName,
          b.name AS businessName,
          b.email AS businessEmail,
          f.name AS farmerName,
          f.email AS farmerEmail
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users b ON o.business_id = b.id
        JOIN users f ON o.farmer_id = f.id
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
          o.created_at AS createdAt,
          p.name AS productName,
          b.name AS businessName,
          b.email AS businessEmail,
          f.name AS farmerName,
          f.email AS farmerEmail
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users b ON o.business_id = b.id
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

    res.json(orders);
  } catch (error) {
    console.log("Get orders error:", error);

    res.status(500).json({
      message: "Could not get orders.",
    });
  }
};

// Farmer accepts, cancels, or marks an order as delivered
export const updateOrderStatus = async (req, res) => {
  let connection;

  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const farmerId = req.user.id;

    // Only these status changes are allowed
    if (!["Accepted", "Cancelled", "Delivered"].includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get order only if it belongs to the logged-in farmer
    const [orders] = await connection.execute(
      `SELECT id, product_id, quantity, status
       FROM orders
       WHERE id = ? AND farmer_id = ?
       FOR UPDATE`,
      [orderId, farmerId]
    );

    const order = orders[0];

    if (!order) {
      await connection.rollback();

      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // These are the only allowed status paths
    const allowedChanges = {
      Pending: ["Accepted", "Cancelled"],
      Accepted: ["Delivered"],
    };

    if (!allowedChanges[order.status]?.includes(status)) {
      await connection.rollback();

      return res.status(400).json({
        message: `Cannot change ${order.status} order to ${status}.`,
      });
    }

    // If farmer cancels, return reserved stock to product
    if (status === "Cancelled") {
      await connection.execute(
        "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        [order.quantity, order.product_id]
      );
    }

    // Update order status
    await connection.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    await connection.commit();

    res.json({
      message: `Order ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.log("Update order status error:", error);

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      message: "Could not update order status.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};