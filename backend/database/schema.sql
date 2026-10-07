-- =======================================================
-- MediLink: Medical Shop Management System Database Schema
-- Database: medilink
-- =======================================================

CREATE DATABASE IF NOT EXISTS `medilink` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `medilink`;

-- Disable FK checks for clean setup
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `partner_shop_medicines`;
DROP TABLE IF EXISTS `partner_medical_shops`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `purchase_items`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `medicine_batches`;
DROP TABLE IF EXISTS `medicines`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Branches
CREATE TABLE `branches` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `manager` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pin` VARCHAR(20) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `opening` VARCHAR(20) DEFAULT '08:30 AM',
  `closing` VARCHAR(20) DEFAULT '09:30 PM',
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `staff` INT DEFAULT 1,
  `is_hq` BOOLEAN DEFAULT FALSE,
  `lat` DECIMAL(10, 7) NOT NULL,
  `lng` DECIMAL(10, 7) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_branch_city` (`city`),
  INDEX `idx_branch_status` (`status`)
) ENGINE=InnoDB;

-- 3. Users
CREATE TABLE `users` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `role_id` INT NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `last_login` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  INDEX `idx_user_username` (`username`),
  INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB;

-- 4. Categories
CREATE TABLE `categories` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category_name` (`name`)
) ENGINE=InnoDB;

-- 5. Suppliers
CREATE TABLE `suppliers` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `company` VARCHAR(150) NOT NULL,
  `contact` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `gst` VARCHAR(50) NOT NULL,
  `license` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_supplier_name` (`name`),
  INDEX `idx_supplier_city` (`city`)
) ENGINE=InnoDB;

-- 6. Medicines
CREATE TABLE `medicines` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `generic` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(100) NULL,
  `category_id` VARCHAR(20) NOT NULL,
  `manufacturer` VARCHAR(150) NOT NULL,
  `dosage` VARCHAR(50) NULL,
  `strength` VARCHAR(50) NULL,
  `type` ENUM('OTC', 'Prescription', 'Antibiotic', 'Supplement') DEFAULT 'OTC',
  `rx` BOOLEAN DEFAULT FALSE,
  `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `gst` DECIMAL(5, 2) NOT NULL DEFAULT 12.00,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
  INDEX `idx_med_name` (`name`),
  INDEX `idx_med_generic` (`generic`),
  INDEX `idx_med_category` (`category_id`)
) ENGINE=InnoDB;

-- 7. Medicine Batches
CREATE TABLE `medicine_batches` (
  `id` VARCHAR(50) PRIMARY KEY,
  `batch_no` VARCHAR(50) NOT NULL,
  `medicine_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `supplier_id` VARCHAR(20) NULL,
  `mfg_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `available` INT NOT NULL DEFAULT 0,
  `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `rack` VARCHAR(50) DEFAULT 'A1-01',
  `status` ENUM('Safe', 'Expiring Soon', 'Expired') DEFAULT 'Safe',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  INDEX `idx_batch_med_branch` (`medicine_id`, `branch_id`),
  INDEX `idx_batch_expiry` (`expiry_date`),
  INDEX `idx_batch_no` (`batch_no`)
) ENGINE=InnoDB;

-- 8. Customers
CREATE TABLE `customers` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NULL,
  `rx_ref` VARCHAR(50) DEFAULT '-',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer_phone` (`phone`),
  INDEX `idx_customer_name` (`name`)
) ENGINE=InnoDB;

-- 9. Purchases
CREATE TABLE `purchases` (
  `id` VARCHAR(20) PRIMARY KEY,
  `invoice` VARCHAR(100) NOT NULL UNIQUE,
  `supplier_id` VARCHAR(20) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `purchased_by` VARCHAR(100) NOT NULL,
  `purchase_date` DATE NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `payment` ENUM('Paid', 'Pending', 'Partially Paid') DEFAULT 'Pending',
  `status` ENUM('Received', 'Ordered') DEFAULT 'Received',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  INDEX `idx_purchase_invoice` (`invoice`),
  INDEX `idx_purchase_date` (`purchase_date`)
) ENGINE=InnoDB;

-- 10. Purchase Items
CREATE TABLE `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` VARCHAR(20) NOT NULL,
  `medicine_id` VARCHAR(20) NOT NULL,
  `batch_no` VARCHAR(50) NOT NULL,
  `mfg_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `quantity` INT NOT NULL,
  `purchase_price` DECIMAL(10, 2) NOT NULL,
  `discount` DECIMAL(5, 2) DEFAULT 0.00,
  `gst` DECIMAL(5, 2) DEFAULT 12.00,
  `total` DECIMAL(10, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT,
  INDEX `idx_pi_purchase` (`purchase_id`)
) ENGINE=InnoDB;

-- 11. Sales
CREATE TABLE `sales` (
  `id` VARCHAR(20) PRIMARY KEY,
  `bill` VARCHAR(100) NOT NULL UNIQUE,
  `customer_id` VARCHAR(20) NULL,
  `customer_name` VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
  `branch_id` VARCHAR(20) NOT NULL,
  `pharmacist_name` VARCHAR(100) NOT NULL,
  `sale_date` DATE NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `gst` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `payment` ENUM('Cash', 'UPI', 'Card') NOT NULL DEFAULT 'Cash',
  `status` ENUM('Completed', 'Refunded', 'Cancelled') NOT NULL DEFAULT 'Completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  INDEX `idx_sale_bill` (`bill`),
  INDEX `idx_sale_date` (`sale_date`),
  INDEX `idx_sale_branch` (`branch_id`)
) ENGINE=InnoDB;

-- 12. Sale Items
CREATE TABLE `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` VARCHAR(20) NOT NULL,
  `medicine_id` VARCHAR(20) NOT NULL,
  `batch_id` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `discount` DECIMAL(5, 2) DEFAULT 0.00,
  `gst` DECIMAL(5, 2) DEFAULT 12.00,
  `total` DECIMAL(10, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`batch_id`) REFERENCES `medicine_batches`(`id`) ON DELETE RESTRICT,
  INDEX `idx_si_sale` (`sale_id`)
) ENGINE=InnoDB;

-- 13. Reservations
CREATE TABLE `reservations` (
  `id` VARCHAR(20) PRIMARY KEY,
  `customer_id` VARCHAR(20) NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `medicine_id` VARCHAR(20) NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `branch_id` VARCHAR(20) NOT NULL,
  `branch_name` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `res_date` DATE NOT NULL,
  `expiry` DATE NOT NULL,
  `status` ENUM('Pending', 'Reserved', 'Collected', 'Cancelled', 'Expired') DEFAULT 'Pending',
  `created_by` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  INDEX `idx_res_status` (`status`),
  INDEX `idx_res_date` (`res_date`)
) ENGINE=InnoDB;

-- 14. Partner Medical Shops
CREATE TABLE `partner_medical_shops` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `owner` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pin` VARCHAR(20) NOT NULL,
  `license` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `lat` DECIMAL(10, 7) NOT NULL,
  `lng` DECIMAL(10, 7) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_partner_city` (`city`),
  INDEX `idx_partner_status` (`status`)
) ENGINE=InnoDB;

-- 15. Partner Shop Medicines
CREATE TABLE `partner_shop_medicines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_shop_id` VARCHAR(20) NOT NULL,
  `medicine_id` VARCHAR(20) NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `last_updated` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`partner_shop_id`) REFERENCES `partner_medical_shops`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE SET NULL,
  INDEX `idx_psm_shop` (`partner_shop_id`),
  INDEX `idx_psm_med_name` (`medicine_name`)
) ENGINE=InnoDB;

-- 16. Prescriptions
CREATE TABLE `prescriptions` (
  `id` VARCHAR(20) PRIMARY KEY,
  `customer_id` VARCHAR(20) NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `medicine_id` VARCHAR(20) NULL,
  `medicine` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `doctor_name` VARCHAR(100) NOT NULL,
  `prescription_date` DATE NOT NULL,
  `prescription_ref` VARCHAR(50) NOT NULL,
  `status` ENUM('Pending', 'Verified', 'Rejected', 'Expired') DEFAULT 'Pending',
  `verified_by` VARCHAR(100) DEFAULT '',
  `verified_date` VARCHAR(50) DEFAULT '',
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON DELETE SET NULL,
  INDEX `idx_prescription_cust_med` (`customer_name`, `medicine`),
  INDEX `idx_prescription_status` (`status`)
) ENGINE=InnoDB;

-- 17. Notifications
CREATE TABLE `notifications` (
  `id` VARCHAR(20) PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `desc` TEXT NOT NULL,
  `time` VARCHAR(100) NOT NULL,
  `read` BOOLEAN DEFAULT FALSE,
  `branch_id` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  INDEX `idx_notif_read` (`read`)
) ENGINE=InnoDB;
