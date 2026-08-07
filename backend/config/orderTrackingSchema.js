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
      !statusColumns[0].columnType.includes("Out for Delivery"))
  ) {
    await pool.execute(
      `ALTER TABLE orders
       MODIFY status ENUM(
         'Awaiting Payment', 'Pending', 'Accepted',
         'Out for Delivery', 'Delivered', 'Cancelled'
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

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_tracking_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(60) NOT NULL,
      note VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tracking_events_order_created (order_id, created_at)
    ) ENGINE=InnoDB
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_delivery_locations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      note VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_delivery_locations_order_created (order_id, created_at)
    ) ENGINE=InnoDB
  `);
}
