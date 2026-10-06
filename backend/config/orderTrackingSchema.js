import pool from "./db.js";
import { ensureModularSchema } from "./modularSchemaMigration.js";

// Keeps existing FarmLink databases compatible when order tracking and delivery features are added.
// It is safe to run every time the API starts.
export async function ensureOrderTrackingSchema() {
  // 1. Upgrade users account_type ENUM to include 'delivery'
  const [userAccountTypeCol] = await pool.execute(
    `SELECT column_type AS columnType
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'users'
       AND column_name = 'account_type'`
  );

  if (userAccountTypeCol[0] && !userAccountTypeCol[0].columnType.includes("delivery")) {
    await pool.execute(
      `ALTER TABLE users
       MODIFY account_type ENUM('farmer', 'business', 'admin', 'delivery') NOT NULL DEFAULT 'business'`
    );
  }

  // 2. Add delivery partner rider fields to users table
  const userRiderColumns = [
    ["phone", "VARCHAR(20) NULL"],
    ["vehicle_type", "VARCHAR(50) NULL DEFAULT 'Bike'"],
    ["vehicle_number", "VARCHAR(30) NULL"],
    ["availability_status", "ENUM('AVAILABLE', 'BUSY', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE'"],
    ["current_latitude", "DECIMAL(10, 7) NULL"],
    ["current_longitude", "DECIMAL(10, 7) NULL"],
    ["last_location_time", "TIMESTAMP NULL"],
  ];
  for (const [column, definition] of userRiderColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) {
      await pool.execute(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    }
  }

  // 3. Upgrade orders status ENUM to include Swiggy/Uber-style delivery workflow
  const fullOrderStatusEnum = `ENUM(
    'Awaiting Payment', 'Pending', 'Accepted',
    'Delivery Boy Assigned', 'Going to Farmer', 'Reached Farmer',
    'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered',
    'Cancelled', 'CANCELLED_BY_BUYER'
  )`;

  const [statusColumns] = await pool.execute(
    `SELECT column_type AS columnType
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'orders'
       AND column_name = 'status'`
  );

  if (
    statusColumns[0] &&
    (!statusColumns[0].columnType.includes("Going to Farmer") ||
      !statusColumns[0].columnType.includes("Reached Farmer"))
  ) {
    await pool.execute(
      `ALTER TABLE orders MODIFY status ${fullOrderStatusEnum} NULL DEFAULT 'Pending'`
    );
  }

  // 4. Add delivery assignment and milestone timestamps to orders table
  const orderDeliveryColumns = [
    ["delivery_boy_id", "INT NULL"],
    ["assigned_at", "TIMESTAMP NULL"],
    ["reached_farmer_at", "TIMESTAMP NULL"],
    ["picked_up_at", "TIMESTAMP NULL"],
    ["in_transit_at", "TIMESTAMP NULL"],
    ["out_for_delivery_at", "TIMESTAMP NULL"],
    ["delivered_at", "TIMESTAMP NULL"],
    ["delivery_notes", "VARCHAR(255) NULL"],
  ];
  for (const [column, definition] of orderDeliveryColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) {
      await pool.execute(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
    }
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

  const locationExtraColumns = [
    ["delivery_boy_id", "INT NULL"],
    ["speed", "DECIMAL(5, 2) NULL"],
    ["heading", "DECIMAL(5, 2) NULL"],
    ["accuracy", "DECIMAL(8, 2) NULL"],
  ];
  for (const [column, definition] of locationExtraColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_delivery_locations' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) {
      await pool.execute(`ALTER TABLE order_delivery_locations ADD COLUMN ${column} ${definition}`);
    }
  }

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
      status ${fullOrderStatusEnum} NULL DEFAULT 'Pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order_items_order (order_id),
      INDEX idx_order_items_farmer (farmer_id),
      INDEX idx_order_items_product (product_id)
    ) ENGINE=InnoDB
  `);

  const [orderItemsStatusCol] = await pool.execute(
    `SELECT column_type AS columnType
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'order_items'
       AND column_name = 'status'`
  );

  if (
    orderItemsStatusCol[0] &&
    (!orderItemsStatusCol[0].columnType.includes("Going to Farmer") ||
      !orderItemsStatusCol[0].columnType.includes("Reached Farmer"))
  ) {
    await pool.execute(
      `ALTER TABLE order_items MODIFY status ${fullOrderStatusEnum} NULL DEFAULT 'Pending'`
    );
  }

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

  // Table to track orders rejected/denied by a specific delivery rider
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rider_rejected_orders (
      rro_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      rider_id INT NOT NULL,
      order_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_rider_order_rejection (rider_id, order_id),
      INDEX idx_rro_rider (rider_id)
    ) ENGINE=InnoDB
  `);

  // User removal columns for admin management (soft delete with reason)
  const userRemovalColumns = [
    ["is_deleted", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["removal_reason", "VARCHAR(255) NULL"],
    ["removed_at", "TIMESTAMP NULL"],
  ];
  for (const [column, definition] of userRemovalColumns) {
    const [existing] = await pool.execute(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`,
      [column]
    );
    if (existing.length === 0) {
      await pool.execute(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    }
  }

  // Ensure clean modular normalized tables exist and are populated
  await ensureModularSchema();
}



