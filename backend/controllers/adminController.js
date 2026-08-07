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
      SELECT u.id, u.name, u.email, u.created_at AS createdAt,
        (SELECT COUNT(*) FROM products p WHERE p.farmer_id = u.id) AS productCount,
        (SELECT COUNT(*) FROM orders o WHERE o.farmer_id = u.id) AS orderCount
      FROM users u
      WHERE u.account_type = 'farmer'
      ORDER BY u.created_at DESC
    `);

    const [businesses] = await pool.execute(`
      SELECT u.id, u.name, u.email, u.created_at AS createdAt,
        (SELECT COUNT(*) FROM orders o WHERE o.business_id = u.id) AS orderCount,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.business_id = u.id) AS orderValue
      FROM users u
      WHERE u.account_type = 'business'
      ORDER BY u.created_at DESC
    `);

    const [products] = await pool.execute(`
      SELECT p.id, p.name, p.category, p.quantity, p.unit, p.price, p.location,
        p.created_at AS createdAt, u.name AS farmerName, u.email AS farmerEmail
      FROM products p
      JOIN users u ON u.id = p.farmer_id
      ORDER BY p.created_at DESC
    `);

    const [orders] = await pool.execute(`
      SELECT o.id, o.quantity, o.total, o.status, o.payment_method AS paymentMethod,
        o.payment_status AS paymentStatus, o.created_at AS createdAt,
        p.name AS productName, f.name AS farmerName, b.name AS businessName
      FROM orders o
      JOIN products p ON p.id = o.product_id
      JOIN users f ON f.id = o.farmer_id
      JOIN users b ON b.id = o.business_id
      ORDER BY o.created_at DESC
    `);

    return res.json({ summary, farmers, businesses, products, orders });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return res.status(500).json({ message: "Could not load admin dashboard data." });
  }
};
