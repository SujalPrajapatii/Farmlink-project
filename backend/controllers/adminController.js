import pool from "../config/db.js";

// Only the admin route calls this controller. It returns operational data,
// never password hashes or other authentication secrets.
export const getDashboardData = async (req, res) => {
  try {
    const [[summary]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE account_type = 'farmer') AS farmers,
        (SELECT COUNT(*) FROM users WHERE account_type = 'business') AS businesses,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'Delivered') AS deliveredSales
    `);

    const [farmers] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.created_at AS createdAt,
        (SELECT COUNT(*) FROM products p WHERE p.farmer_id = u.u_id) AS productCount,
        (SELECT COUNT(DISTINCT oi.order_id) FROM order_items oi WHERE oi.farmer_id = u.u_id) AS orderCount
      FROM users u
      WHERE u.account_type = 'farmer'
      ORDER BY u.created_at DESC
    `);

    const [businesses] = await pool.execute(`
      SELECT u.u_id AS id, u.name, u.email, u.created_at AS createdAt,
        (SELECT COUNT(*) FROM orders o WHERE o.business_id = u.u_id) AS orderCount,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.business_id = u.u_id) AS orderValue
      FROM users u
      WHERE u.account_type = 'business'
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
        o.payment_status AS paymentStatus, o.created_at AS createdAt,
        b.name AS businessName,
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
      ORDER BY o.created_at DESC
    `);

    return res.json({ summary, farmers, businesses, products, orders });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return res.status(500).json({ message: "Could not load admin dashboard data." });
  }
};
