-- ========================================================
-- FarmLink Complete Database Schema & Seed Data
-- Database Name: farmlink_db
-- Generated from project schema dictionary & backend models
-- ========================================================

CREATE DATABASE IF NOT EXISTS `farmlink_db`;
USE `farmlink_db`;

-- 1. Users Master Table
CREATE TABLE IF NOT EXISTS `users` (
  `u_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `account_type` ENUM('farmer', 'business', 'admin', 'delivery') NOT NULL DEFAULT 'business',
  `phone` VARCHAR(20) NULL,
  `vehicle_type` VARCHAR(50) NULL DEFAULT 'Bike',
  `vehicle_number` VARCHAR(30) NULL,
  `availability_status` ENUM('AVAILABLE', 'BUSY', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE',
  `current_latitude` DECIMAL(10, 7) NULL,
  `current_longitude` DECIMAL(10, 7) NULL,
  `last_location_time` TIMESTAMP NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `removal_reason` VARCHAR(255) NULL,
  `removed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Produce Categories Master Table
CREATE TABLE IF NOT EXISTS `categories` (
  `cat_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL UNIQUE,
  `slug` VARCHAR(80) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Produce Crop Listings Table
CREATE TABLE IF NOT EXISTS `products` (
  `p_id` INT AUTO_INCREMENT PRIMARY KEY,
  `farmer_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `unit` ENUM('KG', 'QUINTAL', 'BAG', 'CRATE') NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `tier1_min_qty` INT NOT NULL DEFAULT 51,
  `tier1_discount_pct` INT NOT NULL DEFAULT 10,
  `tier2_min_qty` INT NOT NULL DEFAULT 201,
  `tier2_discount_pct` INT NOT NULL DEFAULT 20,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `users` (`u_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. B2B Wholesale Volume Discount Tiers
CREATE TABLE IF NOT EXISTS `product_tier_pricing` (
  `tier_id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `tier_level` INT NOT NULL,
  `min_quantity` INT NOT NULL,
  `discount_pct` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_product_tier` (`product_id`, `tier_level`),
  CONSTRAINT `fk_tier_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`p_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Business Buyer Saved Delivery Addresses
CREATE TABLE IF NOT EXISTS `delivery_addresses` (
  `da_id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_id` INT NOT NULL,
  `recipient_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address_line1` VARCHAR(255) NOT NULL,
  `address_line2` VARCHAR(255) NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pincode` VARCHAR(10) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_addr_business` FOREIGN KEY (`business_id`) REFERENCES `users` (`u_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Core Orders Header Table
CREATE TABLE IF NOT EXISTS `orders` (
  `o_id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_id` INT NOT NULL,
  `total` DECIMAL(12, 2) NOT NULL,
  `status` ENUM(
    'Awaiting Payment', 'Pending', 'Accepted',
    'Delivery Boy Assigned', 'Going to Farmer', 'Reached Farmer',
    'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered',
    'Cancelled', 'CANCELLED_BY_BUYER'
  ) NULL DEFAULT 'Pending',
  `delivery_address_id` INT NULL,
  `delivery_boy_id` INT NULL,
  `delivery_name` VARCHAR(100) NULL,
  `delivery_phone` VARCHAR(20) NULL,
  `delivery_address` TEXT NULL,
  `tracking_code` VARCHAR(100) NULL,
  `delivery_otp` VARCHAR(10) NULL,
  `delivery_notes` VARCHAR(255) NULL,
  `payment_method` ENUM('COD', 'ONLINE') NOT NULL DEFAULT 'COD',
  `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `gateway_order_id` VARCHAR(100) NULL,
  `gateway_payment_id` VARCHAR(100) NULL,
  `assigned_at` TIMESTAMP NULL,
  `reached_farmer_at` TIMESTAMP NULL,
  `picked_up_at` TIMESTAMP NULL,
  `in_transit_at` TIMESTAMP NULL,
  `out_for_delivery_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `cancelled_by_user_id` BIGINT UNSIGNED NULL,
  `cancelled_by_role` VARCHAR(20) NULL,
  `cancellation_reason` VARCHAR(255) NULL,
  `cancelled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_order_buyer` FOREIGN KEY (`business_id`) REFERENCES `users` (`u_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 3NF Normalized Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `oi_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `farmer_id` INT NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount_pct` INT NOT NULL DEFAULT 0,
  `original_total` DECIMAL(10, 2) NULL,
  `total` DECIMAL(10, 2) NOT NULL,
  `status` ENUM(
    'Awaiting Payment', 'Pending', 'Accepted',
    'Delivery Boy Assigned', 'Going to Farmer', 'Reached Farmer',
    'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered',
    'Cancelled', 'CANCELLED_BY_BUYER'
  ) NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_items_order` (`order_id`),
  INDEX `idx_order_items_farmer` (`farmer_id`),
  INDEX `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_item_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`o_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`p_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Order Cancellations Audit Ledger
CREATE TABLE IF NOT EXISTS `order_cancellations` (
  `cancellation_id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL UNIQUE,
  `cancelled_by_user_id` BIGINT UNSIGNED NULL,
  `cancelled_by_role` VARCHAR(20) NULL,
  `cancellation_reason` VARCHAR(255) NULL,
  `cancelled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cancel_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`o_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Order Deliveries Master Table
CREATE TABLE IF NOT EXISTS `order_deliveries` (
  `delivery_id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL UNIQUE,
  `rider_id` INT NULL,
  `recipient_name` VARCHAR(100) NULL,
  `recipient_phone` VARCHAR(20) NULL,
  `shipping_address` TEXT NULL,
  `tracking_code` VARCHAR(100) NULL,
  `delivery_otp` VARCHAR(10) NULL,
  `delivery_notes` VARCHAR(255) NULL,
  `assigned_at` TIMESTAMP NULL,
  `reached_farmer_at` TIMESTAMP NULL,
  `picked_up_at` TIMESTAMP NULL,
  `in_transit_at` TIMESTAMP NULL,
  `out_for_delivery_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_delivery_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`o_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_rider` FOREIGN KEY (`rider_id`) REFERENCES `users` (`u_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Delivery Rider Fleet & Telemetry Profiles
CREATE TABLE IF NOT EXISTS `delivery_rider_profiles` (
  `rider_profile_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `vehicle_type` VARCHAR(50) NOT NULL DEFAULT 'Bike',
  `vehicle_number` VARCHAR(30) NULL,
  `availability_status` ENUM('AVAILABLE','BUSY','OFFLINE') NOT NULL DEFAULT 'AVAILABLE',
  `current_latitude` DECIMAL(10, 7) NULL,
  `current_longitude` DECIMAL(10, 7) NULL,
  `last_location_time` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rider_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`u_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Live GPS Location Tracking
CREATE TABLE IF NOT EXISTS `order_delivery_locations` (
  `odl_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `note` VARCHAR(255) NOT NULL,
  `delivery_boy_id` INT NULL,
  `speed` DECIMAL(5, 2) NULL,
  `heading` DECIMAL(5, 2) NULL,
  `accuracy` DECIMAL(8, 2) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_delivery_locations_order_created` (`order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Courier Rejection Tracking
CREATE TABLE IF NOT EXISTS `rider_rejected_orders` (
  `rro_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `rider_id` INT NOT NULL,
  `order_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_rider_order_rejection` (`rider_id`, `order_id`),
  INDEX `idx_rro_rider` (`rider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Financial Payments Ledger
CREATE TABLE IF NOT EXISTS `payments` (
  `pay_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_method` ENUM('COD', 'ONLINE') NOT NULL DEFAULT 'COD',
  `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `gateway_order_id` VARCHAR(100) NULL,
  `gateway_payment_id` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payments_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Real-time Customer & Rider Notifications
CREATE TABLE IF NOT EXISTS `order_notifications` (
  `on_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `type` VARCHAR(80) NULL,
  `title` VARCHAR(120) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_notifications_user_created` (`user_id`, `created_at`),
  UNIQUE KEY `uniq_order_notification_event` (`user_id`, `order_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Lifecycle Tracking Events
CREATE TABLE IF NOT EXISTS `order_tracking_events` (
  `ote_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(60) NOT NULL,
  `note` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tracking_events_order_created` (`order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Categories
INSERT IGNORE INTO `categories` (`name`, `slug`, `description`) VALUES
('Vegetables', 'vegetables', 'Fresh farm harvested vegetables'),
('Fruits', 'fruits', 'Fresh seasonal fruits'),
('Grains', 'grains', 'Wholesale agricultural grains'),
('Pulses', 'pulses', 'High quality organic pulses');

-- Seed Initial Demo Users (Password: Password123!)
-- Hash generated by bcrypt (cost: 12)
INSERT IGNORE INTO `users` (`u_id`, `name`, `email`, `password_hash`, `account_type`, `phone`, `vehicle_type`, `vehicle_number`, `availability_status`) VALUES
(1, 'Admin', 'admin@farmlink.com', '$2a$12$DgljJ90yG1c/wz46rOfeK.5lC4R0M4k791nI7xR6Zt1uR7/3w4Jda', 'admin', '9898989898', NULL, NULL, 'AVAILABLE'),
(2, 'Ramesh Patel (Organic Farmer)', 'ramesh.patel@farmlink.com', '$2a$12$DgljJ90yG1c/wz46rOfeK.5lC4R0M4k791nI7xR6Zt1uR7/3w4Jda', 'farmer', '9876543210', NULL, NULL, 'AVAILABLE'),
(3, 'Pooja Mehta (Business Buyer)', 'pooja.mehta@farmlink.com', '$2a$12$DgljJ90yG1c/wz46rOfeK.5lC4R0M4k791nI7xR6Zt1uR7/3w4Jda', 'business', '9123456780', NULL, NULL, 'AVAILABLE'),
(4, 'Vikram Delivery Hero', 'vikram.rider@farmlink.com', '$2a$12$DgljJ90yG1c/wz46rOfeK.5lC4R0M4k791nI7xR6Zt1uR7/3w4Jda', 'delivery', '9988776655', 'Electric Scooter', 'GJ-01-FL-9988', 'AVAILABLE');

-- Seed Rider Profile for Demo Delivery Partner
INSERT IGNORE INTO `delivery_rider_profiles` (`user_id`, `vehicle_type`, `vehicle_number`, `availability_status`) VALUES
(4, 'Electric Scooter', 'GJ-01-FL-9988', 'AVAILABLE');
