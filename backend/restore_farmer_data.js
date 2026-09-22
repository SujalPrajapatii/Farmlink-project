import pool from "./config/db.js";

async function restoreData() {
  console.log("=== Restoring FarmLink Farmer & Marketplace Data ===");

  // 1. Assign products 3, 4, 5, 6, 8 back to Farmer 2 (Sanket Jadav - sd1@gmal.com)
  // Matching his 40 order items in order_items
  const [f2Update] = await pool.execute(`
    UPDATE products
    SET farmer_id = 2,
        quantity = IF(quantity < 50, 200, quantity)
    WHERE p_id IN (3, 4, 5, 6, 8)
  `);
  console.log(`✓ Reassigned products (3, 4, 5, 6, 8) to Farmer 2 (Sanket Jadav). Rows affected: ${f2Update.affectedRows}`);

  // 2. Assign products 1, 2, 22, 23, 24, 25 to Farmer 27 (Ramesh Patel - ramesh.patel@farmlink.com)
  const [f27Update] = await pool.execute(`
    UPDATE products
    SET farmer_id = 27,
        quantity = IF(quantity < 50, 150, quantity)
    WHERE p_id IN (1, 2, 22, 23, 24, 25)
  `);
  console.log(`✓ Assigned products (1, 2, 22, 23, 24, 25) to Farmer 27 (Ramesh Patel). Rows affected: ${f27Update.affectedRows}`);

  // 3. Verify counts
  const [farmer2Prods] = await pool.execute("SELECT p_id, name, quantity, price FROM products WHERE farmer_id = 2");
  console.log("Farmer 2 (Sanket Jadav) Products:", farmer2Prods);

  const [farmer27Prods] = await pool.execute("SELECT p_id, name, quantity, price FROM products WHERE farmer_id = 27");
  console.log("Farmer 27 (Ramesh Patel) Products:", farmer27Prods);

  const [farmer2Orders] = await pool.execute("SELECT COUNT(DISTINCT order_id) as count FROM order_items WHERE farmer_id = 2");
  console.log("Farmer 2 Orders count:", farmer2Orders[0].count);

  const [farmer27Orders] = await pool.execute("SELECT COUNT(DISTINCT order_id) as count FROM order_items WHERE farmer_id = 27");
  console.log("Farmer 27 Orders count:", farmer27Orders[0].count);

  console.log("=== Data restoration complete ===");
  process.exit(0);
}

restoreData().catch((err) => {
  console.error("Data restore error:", err);
  process.exit(1);
});
