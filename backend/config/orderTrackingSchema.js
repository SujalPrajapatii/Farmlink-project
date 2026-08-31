import pool from "./db.js";

// Keeps existing FarmLink databases compatible when order tracking is added.
// It is safe to run every time the API starts.
export async function ensureOrderTrackingSchema() {
  // Existing databases created before online payments only allowed four statuses.
  // Online checkout needs Awaiting Payment and delivery tracking needs Out for Delivery.
  const [statusColumns] = await pool.execute(
    `SELECT column_type AS columnType
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'orders'
       AND column_name = 'status'`
  );

  if (
    statusColumns[0] &&
    (!statusColumns[0].columnType.includes("Awaiting Payment") ||
      !statusColumns[0].columnType.includes("Out for Delivery") ||
      !statusColumns[0].columnType.includes("CANCELLED_BY_BUYER"))
  ) {
    await pool.execute(
      `ALTER TABLE orders
       MODIFY status ENUM(
         'Awaiting Payment', 'Pending', 'Accepted',
         'Out for Delivery', 'Delivered', 'Cancelled', 'CANCELLED_BY_BUYER'
       ) NULL DEFAULT 'Pending'`
    );
  }

  const [trackingCodeColumn] = await pool.execute(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'orders'
       AND column_name = 'tracking_code'`
  );

  if (trackingCodeColumn.length === 0) {
    await pool.execute(
      "ALTER TABLE orders ADD COLUMN tracking_code VARCHAR(100) NULL"
    );
  }

  const [otpColumn] = await pool.execute(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'orders'
       AND column_name = 'delivery_otp'`
  );

  if (otpColumn.length === 0) {
    await pool.execute(
      "ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(10) NULL"
    );
  }

  const cancellationColumns = [
    ["cancelled_by_user_id", "BIGINT UNSIGNED NULL"],
    ["cancelled_by_role", "VARCHAR(20) NULL"],
    ["cancellation_reason", "VARCHAR(255) NULL"],
    ["cancelled_at", "TIMESTAMP NULL"],
  ];
  for (const [column, definition] of cancellationColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = ?`, [column]
    );
    if (existing.length === 0) await pool.execute(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_tracking_events (
      ote_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(60) NOT NULL,
      note VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tracking_events_order_created (order_id, created_at)
    ) ENGINE=InnoDB
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_delivery_locations (
      odl_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      note VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_delivery_locations_order_created (order_id, created_at)
    ) ENGINE=InnoDB
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_notifications (
      on_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      message VARCHAR(500) NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_notifications_user_created (user_id, created_at)
    ) ENGINE=InnoDB
  `);

  const notificationColumns = [["type", "VARCHAR(80) NULL"], ["title", "VARCHAR(120) NULL"]];
  for (const [column, definition] of notificationColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_notifications' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) await pool.execute(`ALTER TABLE order_notifications ADD COLUMN ${column} ${definition}`);
  }

  const [notificationEventIndex] = await pool.execute(
    `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'order_notifications' AND index_name = 'uniq_order_notification_event'`
  );
  if (notificationEventIndex.length === 0) {
    await pool.execute("CREATE UNIQUE INDEX uniq_order_notification_event ON order_notifications (user_id, order_id, type)");
  }

  // Wholesale Bulk Tiered Pricing schema for products:
  const productTierColumns = [
    ["tier1_min_qty", "INT NOT NULL DEFAULT 51"],
    ["tier1_discount_pct", "INT NOT NULL DEFAULT 10"],
    ["tier2_min_qty", "INT NOT NULL DEFAULT 201"],
    ["tier2_discount_pct", "INT NOT NULL DEFAULT 20"],
  ];
  for (const [column, definition] of productTierColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) {
      await pool.execute(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    }
  }

  // Backfill existing products so all currently added products get the default discount tiers if null/0
  await pool.execute(`
    UPDATE products
    SET
      tier1_min_qty = IF(tier1_min_qty IS NULL OR tier1_min_qty = 0, 51, tier1_min_qty),
      tier1_discount_pct = IF(tier1_discount_pct IS NULL OR tier1_discount_pct = 0, 10, tier1_discount_pct),
      tier2_min_qty = IF(tier2_min_qty IS NULL OR tier2_min_qty = 0, 201, tier2_min_qty),
      tier2_discount_pct = IF(tier2_discount_pct IS NULL OR tier2_discount_pct = 0, 20, tier2_discount_pct)
  `);

  // Order Items table for grouping multiple items inside one checkout (3NF Normalized):
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      oi_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      farmer_id INT NOT NULL,
      quantity DECIMAL(10, 2) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      discount_pct INT NOT NULL DEFAULT 0,
      original_total DECIMAL(10, 2) NULL,
      total DECIMAL(10, 2) NOT NULL,
      status ENUM(
        'Awaiting Payment', 'Pending', 'Accepted',
        'Out for Delivery', 'Delivered', 'Cancelled', 'CANCELLED_BY_BUYER'
      ) NULL DEFAULT 'Pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_items_order (order_id),
      INDEX idx_order_items_farmer (farmer_id),
      INDEX idx_order_items_product (product_id)
    ) ENGINE=InnoDB
  `);

  // Dedicated Payments Table (3NF Normalized):
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      pay_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      payment_method ENUM('COD', 'ONLINE') NOT NULL DEFAULT 'COD',
      payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
      gateway_order_id VARCHAR(100) NULL,
      gateway_payment_id VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payments_order (order_id)
    ) ENGINE=InnoDB
  `);
}

