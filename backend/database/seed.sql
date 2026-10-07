-- =======================================================
-- MediLink: Realistic Demo Data Seed
-- Database: medilink
-- =======================================================

USE `medilink`;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `prescriptions`;
TRUNCATE TABLE `partner_shop_medicines`;
TRUNCATE TABLE `partner_medical_shops`;
TRUNCATE TABLE `reservations`;
TRUNCATE TABLE `sale_items`;
TRUNCATE TABLE `sales`;
TRUNCATE TABLE `purchase_items`;
TRUNCATE TABLE `purchases`;
TRUNCATE TABLE `customers`;
TRUNCATE TABLE `medicine_batches`;
TRUNCATE TABLE `medicines`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `branches`;
TRUNCATE TABLE `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Admin', 'System administrator with complete access to all branches, settings, and reports'),
(2, 'Pharmacist', 'Branch pharmacist handling POS billing, customer dispensing, and reservations');

-- 2. Branches
INSERT INTO `branches` (`id`, `name`, `manager`, `address`, `city`, `state`, `pin`, `phone`, `email`, `opening`, `closing`, `status`, `staff`, `is_hq`, `lat`, `lng`) VALUES
('BR-01', 'Kovilpatti Branch', 'R. Rajan', '12, VOC Street, Bus Stand Road', 'Kovilpatti', 'Tamil Nadu', '628501', '+91 98421 30221', 'kovilpatti@medilink.in', '08:30 AM', '09:30 PM', 'Active', 6, TRUE, 9.1734000, 77.8713000),
('BR-02', 'Tirunelveli Branch', 'K. Meenakshi', '45, Trivandrum Main Road', 'Tirunelveli', 'Tamil Nadu', '627001', '+91 94432 11876', 'tirunelveli@medilink.in', '09:00 AM', '09:00 PM', 'Active', 5, FALSE, 8.7139000, 77.7567000),
('BR-03', 'Madurai Branch', 'P. Arun Kumar', '8, Anna Nagar Main Road', 'Madurai', 'Tamil Nadu', '625020', '+91 90475 62310', 'madurai@medilink.in', '08:00 AM', '10:00 PM', 'Active', 7, FALSE, 9.9252000, 78.1198000);

-- 3. Users (Passwords: Admin = 'admin123', Pharmacist = 'pharma123')
INSERT INTO `users` (`id`, `name`, `username`, `email`, `password_hash`, `phone`, `role_id`, `branch_id`, `status`, `last_login`) VALUES
('USR-01', 'Lavanya M', 'lavanya.admin', 'lavanya.admin@medilink.com', '$2a$10$ocDjgpAAAsb.QcXoldcTU.6.FMmbOccFiXjgH/Puy3M8asI5xo.rm', '+91 90031 22110', 1, 'BR-01', 'Active', '2026-08-20 09:12 AM'),
('USR-02', 'R. Rajan', 'rajan.pharmacist', 'rajan.pharmacist@medilink.com', '$2a$10$C8/ncnGfDijmcYoGILvGp.cNlTjTXY86MHSO2r9trUt27MVxouNFi', '+91 98421 30221', 2, 'BR-01', 'Active', '2026-08-20 08:45 AM'),
('USR-03', 'K. Meenakshi', 'meenakshi.ph', 'meenakshi@medilink.in', '$2a$10$C8/ncnGfDijmcYoGILvGp.cNlTjTXY86MHSO2r9trUt27MVxouNFi', '+91 94432 11876', 2, 'BR-02', 'Active', '2026-08-19 06:30 PM'),
('USR-04', 'P. Arun Kumar', 'arunkumar.ph', 'arunkumar@medilink.in', '$2a$10$C8/ncnGfDijmcYoGILvGp.cNlTjTXY86MHSO2r9trUt27MVxouNFi', '+91 90475 62310', 2, 'BR-03', 'Active', '2026-08-20 07:58 AM'),
('USR-05', 'S. Divya', 'divya.ph', 'divya@medilink.in', '$2a$10$C8/ncnGfDijmcYoGILvGp.cNlTjTXY86MHSO2r9trUt27MVxouNFi', '+91 96297 40012', 2, 'BR-03', 'Inactive', '2026-07-30 11:20 AM'),
('USR-06', 'N. Bhuvaneshwari', 'bhuvana.ph', 'bhuvana@medilink.in', '$2a$10$C8/ncnGfDijmcYoGILvGp.cNlTjTXY86MHSO2r9trUt27MVxouNFi', '+91 89258 90341', 2, 'BR-02', 'Active', '2026-08-18 04:10 PM');

-- 4. Categories
INSERT INTO `categories` (`id`, `name`, `description`, `status`, `created_at`) VALUES
('CAT-01', 'Tablets', 'Oral solid dosage tablets', 'Active', '2024-01-10'),
('CAT-02', 'Capsules', 'Oral solid dosage capsules', 'Active', '2024-01-10'),
('CAT-03', 'Syrups', 'Liquid oral suspensions & syrups', 'Active', '2024-01-11'),
('CAT-04', 'Injections', 'Injectable formulations', 'Active', '2024-01-12'),
('CAT-05', 'Creams', 'Topical creams', 'Active', '2024-01-12'),
('CAT-06', 'Ointments', 'Topical ointments & balms', 'Active', '2024-01-13'),
('CAT-07', 'Drops', 'Eye, ear & nasal drops', 'Active', '2024-01-14'),
('CAT-08', 'Powders', 'Oral rehydration & other powders', 'Active', '2024-01-14'),
('CAT-09', 'Medical Devices', 'Thermometers, BP monitors, glucometers', 'Active', '2024-01-15');

-- 5. Suppliers
INSERT INTO `suppliers` (`id`, `name`, `company`, `contact`, `phone`, `email`, `address`, `city`, `state`, `gst`, `license`, `status`, `created_at`) VALUES
('SUP-01', 'Sun Pharma Distributors', 'Sun Pharmaceutical Industries Ltd.', 'Ramesh Iyer', '+91 98400 12345', 'orders@sunpharmadist.in', 'Guindy Industrial Estate', 'Chennai', 'Tamil Nadu', '33AAACS1234F1Z5', 'TN-DL-88213', 'Active', '2024-02-01'),
('SUP-02', 'Cipla Regional Supply Co.', 'Cipla Ltd.', 'Anitha Raj', '+91 90030 55671', 'regional@ciplasupply.in', 'Ambattur Industrial Area', 'Chennai', 'Tamil Nadu', '33AAACC5678K1Z2', 'TN-DL-77104', 'Active', '2024-02-04'),
('SUP-03', 'Madurai Pharma Agencies', 'Madurai Pharma Agencies Pvt Ltd', 'S. Elango', '+91 97510 66234', 'sales@maduraipharma.in', 'Simmakkal', 'Madurai', 'Tamil Nadu', '33AABCM4321L1Z9', 'TN-DL-65310', 'Active', '2024-02-10'),
('SUP-04', 'Zydus Southern Distribution', 'Zydus Lifesciences Ltd.', 'Vignesh Kumar', '+91 89250 44120', 'south@zydusdist.in', 'Perungudi', 'Chennai', 'Tamil Nadu', '33AAECZ9988P1Z4', 'TN-DL-91002', 'Active', '2024-03-02'),
('SUP-05', 'Tuticorin Surgical & Pharma', 'Tuticorin Surgical Supplies', 'M. Josephine', '+91 96001 23789', 'info@tuticorinsurgical.in', 'Beach Road', 'Thoothukudi', 'Tamil Nadu', '33AADFT5566N1Z1', 'TN-DL-40217', 'Active', '2024-03-15'),
('SUP-06', 'Alkem Regional Hub', 'Alkem Laboratories Ltd.', 'Priya Dharshini', '+91 91765 20984', 'hub.tn@alkemlabs.in', 'Madurai Bypass Road', 'Madurai', 'Tamil Nadu', '33AABCA6789Q1Z7', 'TN-DL-53390', 'Inactive', '2024-04-01');

-- 6. Medicines
INSERT INTO `medicines` (`id`, `name`, `generic`, `brand`, `category_id`, `manufacturer`, `dosage`, `strength`, `type`, `rx`, `purchase_price`, `selling_price`, `gst`, `status`) VALUES
('MED-01', 'Dolo 650', 'Paracetamol', 'Micro Labs', 'CAT-01', 'Micro Labs Ltd.', 'Tablet', '650 mg', 'OTC', FALSE, 18.50, 28.00, 12.00, 'Active'),
('MED-02', 'Crocin 650', 'Paracetamol', 'GSK', 'CAT-01', 'GlaxoSmithKline', 'Tablet', '650 mg', 'OTC', FALSE, 19.00, 29.00, 12.00, 'Active'),
('MED-03', 'Paracetamol 500mg', 'Paracetamol', 'Generic', 'CAT-01', 'Cipla Ltd.', 'Tablet', '500 mg', 'OTC', FALSE, 8.00, 14.00, 12.00, 'Active'),
('MED-04', 'Azithromycin 500mg', 'Azithromycin', 'Azithral', 'CAT-01', 'Alembic Pharmaceuticals', 'Tablet', '500 mg', 'Antibiotic', TRUE, 62.00, 92.00, 12.00, 'Active'),
('MED-05', 'Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Cetzine', 'CAT-01', 'Cipla Ltd.', 'Tablet', '10 mg', 'OTC', FALSE, 9.50, 16.00, 12.00, 'Active'),
('MED-06', 'Pantoprazole 40mg', 'Pantoprazole', 'Pantocid', 'CAT-01', 'Sun Pharmaceutical', 'Tablet', '40 mg', 'Prescription', TRUE, 34.00, 52.00, 12.00, 'Active'),
('MED-07', 'Amoxicillin 500mg', 'Amoxicillin', 'Mox', 'CAT-02', 'Ranbaxy Labs', 'Capsule', '500 mg', 'Antibiotic', TRUE, 41.00, 63.00, 12.00, 'Active'),
('MED-08', 'Metformin 500mg', 'Metformin Hydrochloride', 'Glycomet', 'CAT-01', 'USV Pvt. Ltd.', 'Tablet', '500 mg', 'Prescription', TRUE, 22.00, 34.00, 12.00, 'Active'),
('MED-09', 'Omeprazole 20mg', 'Omeprazole', 'Omez', 'CAT-02', 'Dr. Reddy''s Labs', 'Capsule', '20 mg', 'Prescription', TRUE, 28.00, 44.00, 12.00, 'Active'),
('MED-10', 'Ibuprofen 400mg', 'Ibuprofen', 'Brufen', 'CAT-01', 'Abbott India', 'Tablet', '400 mg', 'OTC', FALSE, 14.00, 22.00, 12.00, 'Active'),
('MED-11', 'ORS Powder', 'Oral Rehydration Salts', 'Electral', 'CAT-08', 'FDC Ltd.', 'Sachet', '21.8 g', 'OTC', FALSE, 12.00, 20.00, 5.00, 'Active'),
('MED-12', 'Calcium + D3 Tablets', 'Calcium Carbonate + Vitamin D3', 'Shelcal', 'CAT-01', 'Torrent Pharmaceuticals', 'Tablet', '500 mg', 'Supplement', FALSE, 45.00, 68.00, 12.00, 'Active'),
('MED-13', 'Ascoril Cough Syrup', 'Bromhexine + Terbutaline + Guaifenesin', 'Ascoril', 'CAT-03', 'Glenmark Pharmaceuticals', 'Syrup', '100 ml', 'Prescription', TRUE, 58.00, 89.00, 12.00, 'Active'),
('MED-14', 'Betadine Ointment', 'Povidone Iodine', 'Betadine', 'CAT-06', 'Win-Medicare', 'Ointment', '20 g', 'OTC', FALSE, 38.00, 58.00, 12.00, 'Active'),
('MED-15', 'Moxifloxacin Eye Drops', 'Moxifloxacin', 'Vigamox', 'CAT-07', 'Alcon Labs', 'Drops', '5 ml', 'Prescription', TRUE, 72.00, 108.00, 12.00, 'Active'),
('MED-16', 'Human Mixtard Insulin', 'Insulin (Human)', 'Mixtard', 'CAT-04', 'Novo Nordisk', 'Injection', '40 IU/ml', 'Prescription', TRUE, 145.00, 210.00, 5.00, 'Active');

-- 7. Customers
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `rx_ref`, `created_at`) VALUES
('CUS-01', 'Ramya Krishnan', '+91 98940 12233', 'ramya.k@gmail.com', '14 Kamarajar Street, Kovilpatti', '-', '2024-05-02'),
('CUS-02', 'Suresh Babu', '+91 90031 44567', 'suresh.babu@gmail.com', '7 North Car Street, Kovilpatti', 'RX-2291', '2024-06-11'),
('CUS-03', 'Lakshmi Narayanan', '+91 97159 88213', 'lakshmi.n@yahoo.com', '22 Palayamkottai Road, Tirunelveli', '-', '2024-06-20'),
('CUS-04', 'Muthu Vel', '+91 96297 33810', 'muthuvel87@gmail.com', '3 Anna Nagar, Madurai', 'RX-3312', '2024-07-05'),
('CUS-05', 'Deepa Rajendran', '+91 89258 76290', 'deepa.r@outlook.com', '18 Bypass Road, Madurai', '-', '2024-08-14'),
('CUS-06', 'Karthikeyan S', '+91 91502 66781', 'karthik.s@gmail.com', '9 Trivandrum Road, Tirunelveli', 'RX-4410', '2024-09-02'),
('CUS-07', 'Vasanthi Murugan', '+91 98430 11290', 'vasanthi.m@gmail.com', '31 VOC Street, Kovilpatti', '-', '2024-09-19'),
('CUS-08', 'Arun Prakash', '+91 90474 55321', 'arun.prakash@gmail.com', '5 Simmakkal, Madurai', 'RX-5108', '2024-10-08');

-- 8. Medicine Batches
INSERT INTO `medicine_batches` (`id`, `batch_no`, `medicine_id`, `branch_id`, `supplier_id`, `mfg_date`, `expiry_date`, `quantity`, `available`, `purchase_price`, `selling_price`, `rack`, `status`) VALUES
('BAT-01', 'MK0112026', 'MED-01', 'BR-01', 'SUP-01', '2026-07-21', '2027-04-17', 75, 75, 18.50, 28.00, 'A1-01', 'Safe'),
('BAT-02', 'MK0122026', 'MED-01', 'BR-02', 'SUP-01', '2026-07-18', '2027-04-15', 52, 52, 18.50, 28.00, 'A1-02', 'Safe'),
('BAT-03', 'MK0132026', 'MED-01', 'BR-03', 'SUP-01', '2026-07-15', '2027-04-13', 29, 29, 18.50, 28.00, 'A2-05', 'Safe'),
('BAT-04', 'MK0212026', 'MED-02', 'BR-01', 'SUP-02', '2026-07-16', '2027-04-11', 28, 28, 19.00, 29.00, 'A1-02', 'Safe'),
('BAT-05', 'MK0222026', 'MED-02', 'BR-02', 'SUP-02', '2026-07-13', '2027-04-09', 95, 95, 19.00, 29.00, 'A2-05', 'Safe'),
('BAT-06', 'MK0232026', 'MED-02', 'BR-03', 'SUP-02', '2026-07-10', '2027-04-07', 72, 72, 19.00, 29.00, 'B1-03', 'Safe'),
('BAT-07', 'MK0312026', 'MED-03', 'BR-01', 'SUP-02', '2026-07-11', '2027-04-05', 71, 71, 8.00, 14.00, 'A2-05', 'Safe'),
('BAT-08', 'MK0322026', 'MED-03', 'BR-02', 'SUP-02', '2026-07-08', '2027-04-03', 48, 48, 8.00, 14.00, 'B1-03', 'Safe'),
('BAT-09', 'MK0412026', 'MED-04', 'BR-01', 'SUP-03', '2026-07-06', '2026-09-07', 24, 6, 62.00, 92.00, 'B1-03', 'Expiring Soon'),
('BAT-10', 'MK0422026', 'MED-04', 'BR-02', 'SUP-03', '2026-07-03', '2027-03-28', 91, 91, 62.00, 92.00, 'B2-01', 'Safe'),
('BAT-11', 'MK0432026', 'MED-04', 'BR-03', 'SUP-03', '2026-06-30', '2027-03-26', 68, 68, 62.00, 92.00, 'C1-04', 'Safe'),
('BAT-12', 'MK0512026', 'MED-05', 'BR-01', 'SUP-02', '2026-07-01', '2027-03-25', 67, 67, 9.50, 16.00, 'B2-01', 'Safe'),
('BAT-13', 'MK0522026', 'MED-05', 'BR-02', 'SUP-02', '2026-06-28', '2027-03-23', 44, 44, 9.50, 16.00, 'C1-04', 'Safe'),
('BAT-14', 'MK0532026', 'MED-05', 'BR-03', 'SUP-02', '2026-06-25', '2027-03-21', 21, 21, 9.50, 16.00, 'C2-02', 'Safe'),
('BAT-15', 'MK0612026', 'MED-06', 'BR-01', 'SUP-01', '2026-06-26', '2027-03-19', 20, 18, 34.00, 52.00, 'C1-04', 'Safe'),
('BAT-16', 'MK0622026', 'MED-06', 'BR-02', 'SUP-01', '2026-06-23', '2027-03-17', 87, 87, 34.00, 52.00, 'C2-02', 'Safe'),
('BAT-17', 'MK0712026', 'MED-07', 'BR-01', 'SUP-04', '2026-06-21', '2027-03-13', 63, 63, 41.00, 63.00, 'C2-02', 'Safe'),
('BAT-18', 'MK0722026', 'MED-07', 'BR-02', 'SUP-04', '2026-06-18', '2027-03-11', 40, 15, 41.00, 63.00, 'D1-01', 'Safe'),
('BAT-19', 'MK0732026', 'MED-07', 'BR-03', 'SUP-04', '2026-06-15', '2027-03-09', 17, 17, 41.00, 63.00, 'A1-01', 'Safe'),
('BAT-20', 'MK0812026', 'MED-08', 'BR-01', 'SUP-04', '2026-06-16', '2027-03-07', 16, 16, 22.00, 34.00, 'D1-01', 'Safe'),
('BAT-21', 'MK0822026', 'MED-08', 'BR-02', 'SUP-04', '2026-06-13', '2026-08-29', 83, 14, 22.00, 34.00, 'A1-01', 'Expiring Soon'),
('BAT-22', 'MK0832026', 'MED-08', 'BR-03', 'SUP-04', '2026-06-10', '2027-03-03', 60, 60, 22.00, 34.00, 'A1-02', 'Safe'),
('BAT-23', 'MK0912026', 'MED-09', 'BR-01', 'SUP-04', '2026-06-11', '2027-03-01', 59, 59, 28.00, 44.00, 'A1-01', 'Safe'),
('BAT-24', 'MK0922026', 'MED-09', 'BR-02', 'SUP-04', '2026-06-08', '2027-02-27', 36, 36, 28.00, 44.00, 'A1-02', 'Safe'),
('BAT-25', 'MK1012026', 'MED-10', 'BR-01', 'SUP-05', '2026-06-06', '2027-02-23', 12, 12, 14.00, 22.00, 'A1-02', 'Safe'),
('BAT-26', 'MK1022026', 'MED-10', 'BR-02', 'SUP-05', '2026-06-03', '2027-02-21', 79, 79, 14.00, 22.00, 'A2-05', 'Safe'),
('BAT-27', 'MK1032026', 'MED-10', 'BR-03', 'SUP-05', '2026-05-31', '2027-02-19', 56, 56, 14.00, 22.00, 'B1-03', 'Safe'),
('BAT-28', 'MK1112026', 'MED-11', 'BR-01', 'SUP-05', '2026-06-01', '2027-02-17', 55, 55, 12.00, 20.00, 'A2-05', 'Safe'),
('BAT-29', 'MK1122026', 'MED-11', 'BR-02', 'SUP-05', '2026-05-29', '2027-02-15', 32, 32, 12.00, 20.00, 'B1-03', 'Safe'),
('BAT-30', 'MK1132026', 'MED-11', 'BR-03', 'SUP-05', '2026-05-26', '2027-02-13', 99, 99, 12.00, 20.00, 'B2-01', 'Safe'),
('BAT-31', 'MK1212026', 'MED-12', 'BR-01', 'SUP-03', '2026-05-27', '2027-02-11', 98, 98, 45.00, 68.00, 'B1-03', 'Safe'),
('BAT-32', 'MK1222026', 'MED-12', 'BR-02', 'SUP-03', '2026-05-24', '2027-02-09', 75, 75, 45.00, 68.00, 'B2-01', 'Safe'),
('BAT-33', 'MK1312026', 'MED-13', 'BR-01', 'SUP-03', '2026-05-22', '2027-02-05', 51, 51, 58.00, 89.00, 'B2-01', 'Safe'),
('BAT-34', 'MK1322026', 'MED-13', 'BR-02', 'SUP-03', '2026-05-19', '2027-02-03', 28, 28, 58.00, 89.00, 'C1-04', 'Safe'),
('BAT-35', 'MK1332026', 'MED-13', 'BR-03', 'SUP-03', '2026-05-16', '2026-08-15', 15, 0, 58.00, 89.00, 'C2-02', 'Expired'),
('BAT-36', 'MK1412026', 'MED-14', 'BR-01', 'SUP-05', '2026-05-17', '2027-01-31', 94, 94, 38.00, 58.00, 'C1-04', 'Safe'),
('BAT-37', 'MK1422026', 'MED-14', 'BR-02', 'SUP-05', '2026-05-14', '2027-01-29', 71, 71, 38.00, 58.00, 'C2-02', 'Safe'),
('BAT-38', 'MK1432026', 'MED-14', 'BR-03', 'SUP-05', '2026-05-11', '2027-01-27', 48, 48, 38.00, 58.00, 'D1-01', 'Safe'),
('BAT-39', 'MK1512026', 'MED-15', 'BR-01', 'SUP-01', '2026-05-12', '2027-01-25', 47, 0, 72.00, 108.00, 'C2-02', 'Safe'),
('BAT-40', 'MK1522026', 'MED-15', 'BR-02', 'SUP-01', '2026-05-09', '2027-01-23', 24, 24, 72.00, 108.00, 'D1-01', 'Safe'),
('BAT-41', 'MK1532026', 'MED-15', 'BR-03', 'SUP-01', '2026-05-06', '2027-01-21', 91, 91, 72.00, 108.00, 'A1-01', 'Safe'),
('BAT-42', 'MK1612026', 'MED-16', 'BR-01', 'SUP-01', '2026-05-07', '2027-01-19', 90, 0, 145.00, 210.00, 'D1-01', 'Safe'),
('BAT-43', 'MK1622026', 'MED-16', 'BR-02', 'SUP-01', '2026-05-04', '2027-01-17', 67, 67, 145.00, 210.00, 'A1-01', 'Safe'),
('BAT-44', 'MK1632026', 'MED-16', 'BR-03', 'SUP-01', '2026-05-01', '2027-01-15', 44, 44, 145.00, 210.00, 'A1-02', 'Safe');

-- 9. Purchases
INSERT INTO `purchases` (`id`, `invoice`, `supplier_id`, `branch_id`, `purchased_by`, `purchase_date`, `amount`, `payment`, `status`) VALUES
('PUR-01', 'SPD/INV/4471', 'SUP-01', 'BR-01', 'Lavanya M', '2026-08-15', 24850.00, 'Paid', 'Received'),
('PUR-02', 'CRS/INV/8823', 'SUP-02', 'BR-03', 'P. Arun Kumar', '2026-08-16', 18200.00, 'Pending', 'Received'),
('PUR-03', 'MPA/INV/1129', 'SUP-03', 'BR-03', 'P. Arun Kumar', '2026-08-12', 9640.00, 'Paid', 'Received'),
('PUR-04', 'ZSD/INV/6602', 'SUP-04', 'BR-02', 'K. Meenakshi', '2026-08-10', 31200.00, 'Paid', 'Received'),
('PUR-05', 'TSP/INV/3391', 'SUP-05', 'BR-01', 'Lavanya M', '2026-08-08', 5480.00, 'Partially Paid', 'Received'),
('PUR-06', 'SPD/INV/4502', 'SUP-01', 'BR-01', 'Lavanya M', '2026-08-19', 16750.00, 'Pending', 'Ordered');

-- 10. Purchase Items
INSERT INTO `purchase_items` (`purchase_id`, `medicine_id`, `batch_no`, `mfg_date`, `expiry_date`, `quantity`, `purchase_price`, `discount`, `gst`, `total`) VALUES
('PUR-01', 'MED-01', 'MK0112026', '2026-07-21', '2027-04-17', 500, 18.50, 0.00, 12.00, 10360.00),
('PUR-01', 'MED-06', 'MK0612026', '2026-06-26', '2027-03-19', 350, 34.00, 0.00, 12.00, 13328.00),
('PUR-02', 'MED-02', 'MK0232026', '2026-07-10', '2027-04-07', 500, 19.00, 0.00, 12.00, 10640.00),
('PUR-02', 'MED-03', 'MK0322026', '2026-07-08', '2027-04-03', 800, 8.00, 0.00, 12.00, 7168.00),
('PUR-03', 'MED-04', 'MK0432026', '2026-06-30', '2027-03-26', 150, 62.00, 0.00, 12.00, 10416.00);

-- 11. Sales
INSERT INTO `sales` (`id`, `bill`, `customer_id`, `customer_name`, `branch_id`, `pharmacist_name`, `sale_date`, `subtotal`, `discount`, `gst`, `amount`, `payment`, `status`) VALUES
('SAL-01', 'MDL/26-27/1001', 'CUS-01', 'Ramya Krishnan', 'BR-01', 'R. Rajan', '2026-08-20', 120.00, 0.00, 14.40, 134.40, 'Cash', 'Completed'),
('SAL-02', 'MDL/26-27/1002', 'CUS-02', 'Suresh Babu', 'BR-02', 'K. Meenakshi', '2026-08-20', 177.00, 0.00, 21.24, 198.24, 'UPI', 'Completed'),
('SAL-03', 'MDL/26-27/1003', 'CUS-03', 'Lakshmi Narayanan', 'BR-03', 'P. Arun Kumar', '2026-08-20', 234.00, 0.00, 28.08, 262.08, 'Card', 'Completed'),
('SAL-04', 'MDL/26-27/1004', 'CUS-04', 'Muthu Vel', 'BR-01', 'R. Rajan', '2026-08-20', 291.00, 0.00, 34.92, 325.92, 'Cash', 'Completed'),
('SAL-05', 'MDL/26-27/1005', 'CUS-05', 'Deepa Rajendran', 'BR-02', 'K. Meenakshi', '2026-08-19', 348.00, 0.00, 41.76, 389.76, 'UPI', 'Completed'),
('SAL-06', 'MDL/26-27/1006', 'CUS-06', 'Karthikeyan S', 'BR-03', 'P. Arun Kumar', '2026-08-19', 405.00, 0.00, 48.60, 453.60, 'Card', 'Completed'),
('SAL-07', 'MDL/26-27/1007', 'CUS-07', 'Vasanthi Murugan', 'BR-01', 'R. Rajan', '2026-08-19', 462.00, 0.00, 55.44, 517.44, 'Cash', 'Completed'),
('SAL-08', 'MDL/26-27/1008', 'CUS-08', 'Arun Prakash', 'BR-02', 'K. Meenakshi', '2026-08-19', 519.00, 0.00, 62.28, 581.28, 'UPI', 'Completed'),
('SAL-09', 'MDL/26-27/1009', 'CUS-01', 'Ramya Krishnan', 'BR-03', 'P. Arun Kumar', '2026-08-18', 576.00, 0.00, 69.12, 645.12, 'Card', 'Completed'),
('SAL-10', 'MDL/26-27/1010', 'CUS-02', 'Suresh Babu', 'BR-01', 'R. Rajan', '2026-08-18', 633.00, 0.00, 75.96, 708.96, 'Cash', 'Completed'),
('SAL-11', 'MDL/26-27/1011', 'CUS-03', 'Lakshmi Narayanan', 'BR-02', 'K. Meenakshi', '2026-08-18', 690.00, 0.00, 82.80, 772.80, 'UPI', 'Completed'),
('SAL-12', 'MDL/26-27/1012', 'CUS-04', 'Muthu Vel', 'BR-03', 'P. Arun Kumar', '2026-08-18', 747.00, 0.00, 89.64, 836.64, 'Card', 'Completed');

-- 12. Sale Items
INSERT INTO `sale_items` (`sale_id`, `medicine_id`, `batch_id`, `quantity`, `unit_price`, `discount`, `gst`, `total`) VALUES
('SAL-01', 'MED-01', 'BAT-01', 3, 28.00, 0.00, 12.00, 94.08),
('SAL-01', 'MED-05', 'BAT-12', 2, 16.00, 0.00, 12.00, 35.84),
('SAL-02', 'MED-02', 'BAT-05', 4, 29.00, 0.00, 12.00, 129.92),
('SAL-03', 'MED-03', 'BAT-08', 5, 14.00, 0.00, 12.00, 78.40),
('SAL-04', 'MED-08', 'BAT-20', 3, 34.00, 0.00, 12.00, 114.24);

-- 13. Reservations
INSERT INTO `reservations` (`id`, `customer_id`, `customer_name`, `medicine_id`, `medicine_name`, `branch_id`, `branch_name`, `quantity`, `res_date`, `expiry`, `status`, `created_by`) VALUES
('RSV-01', 'CUS-02', 'Suresh Babu', 'MED-16', 'Human Mixtard Insulin', 'BR-01', 'Kovilpatti Branch', 2, '2026-08-19', '2026-08-22', 'Pending', 'R. Rajan'),
('RSV-02', 'CUS-04', 'Muthu Vel', 'MED-15', 'Moxifloxacin Eye Drops', 'BR-03', 'Madurai Branch', 1, '2026-08-18', '2026-08-21', 'Reserved', 'P. Arun Kumar'),
('RSV-03', 'CUS-06', 'Karthikeyan S', 'MED-04', 'Azithromycin 500mg', 'BR-02', 'Tirunelveli Branch', 3, '2026-08-17', '2026-08-20', 'Collected', 'K. Meenakshi'),
('RSV-04', 'CUS-07', 'Vasanthi Murugan', 'MED-13', 'Ascoril Cough Syrup', 'BR-01', 'Kovilpatti Branch', 1, '2026-08-15', '2026-08-18', 'Expired', 'R. Rajan'),
('RSV-05', 'CUS-08', 'Arun Prakash', 'MED-08', 'Metformin 500mg', 'BR-03', 'Madurai Branch', 2, '2026-08-14', '2026-08-17', 'Cancelled', 'P. Arun Kumar');

-- 14. Partner Medical Shops
INSERT INTO `partner_medical_shops` (`id`, `name`, `owner`, `phone`, `email`, `address`, `city`, `state`, `pin`, `license`, `status`, `lat`, `lng`) VALUES
('PS-01', 'Sri Lakshmi Medicals', 'T. Chandrasekar', '+91 94860 12093', 'srilakshmi.med@gmail.com', 'Main Bazaar Street', 'Kovilpatti', 'Tamil Nadu', '628501', 'TN-DL-22013', 'Active', 9.1802000, 77.8756000),
('PS-02', 'Apollo Medical Centre', 'R. Kalaivani', '+91 98653 40217', 'apollomedcentre@gmail.com', 'New Bus Stand Road', 'Kovilpatti', 'Tamil Nadu', '628502', 'TN-DL-22098', 'Active', 9.1655000, 77.8639000),
('PS-03', 'Health Care Pharmacy', 'M. Sivakumar', '+91 90921 55678', 'healthcarepharmacy@gmail.com', 'Kaspa Main Road', 'Kovilpatti', 'Tamil Nadu', '628501', 'TN-DL-22140', 'Active', 9.1601000, 77.8801000),
('PS-04', 'Sivan Medical Centre', 'S. Elangovan', '+91 90921 66789', 'sivanmedical@gmail.com', 'Palayamkottai Road', 'Tirunelveli', 'Tamil Nadu', '627002', 'TN-DL-33021', 'Active', 8.7300000, 77.7400000),
('PS-05', 'Meenakshi Medicals', 'V. Ravichandran', '+91 89390 66120', 'meenakshimed@gmail.com', 'West Masi Street', 'Madurai', 'Tamil Nadu', '625001', 'TN-DL-44210', 'Active', 9.9195000, 78.1193000);

-- 15. Partner Shop Medicines
INSERT INTO `partner_shop_medicines` (`partner_shop_id`, `medicine_id`, `medicine_name`, `quantity`, `last_updated`) VALUES
('PS-01', 'MED-16', 'Human Mixtard Insulin', 12, '2026-08-19 05:40 PM'),
('PS-02', 'MED-16', 'Human Mixtard Insulin', 8, '2026-08-20 09:10 AM'),
('PS-03', 'MED-16', 'Human Mixtard Insulin', 5, '2026-08-20 07:50 AM'),
('PS-01', 'MED-14', 'Betadine Ointment', 14, '2026-08-19 07:15 PM'),
('PS-04', 'MED-14', 'Betadine Ointment', 6, '2026-08-19 07:15 PM'),
('PS-02', 'MED-15', 'Moxifloxacin Eye Drops', 9, '2026-08-20 08:20 AM'),
('PS-05', 'MED-15', 'Moxifloxacin Eye Drops', 4, '2026-08-20 08:20 AM');

-- 16. Prescriptions
INSERT INTO `prescriptions` (`id`, `customer_id`, `customer_name`, `medicine_id`, `medicine`, `quantity`, `doctor_name`, `prescription_date`, `prescription_ref`, `status`, `verified_by`, `verified_date`, `remarks`) VALUES
('RX-01', 'CUS-02', 'Suresh Babu', 'MED-16', 'Human Mixtard Insulin', 2, 'Dr. K. Balasubramanian', '2026-08-18', 'RX-2291', 'Verified', 'R. Rajan', '2026-08-19', 'Valid prescription, dosage confirmed.'),
('RX-02', 'CUS-04', 'Muthu Vel', 'MED-04', 'Azithromycin 500mg', 1, 'Dr. S. Priyanka', '2026-08-19', 'RX-3312', 'Pending', '', '', ''),
('RX-03', 'CUS-06', 'Karthikeyan S', 'MED-06', 'Pantoprazole 40mg', 1, 'Dr. M. Anandhi', '2026-07-10', 'RX-4410', 'Expired', 'Lavanya M', '2026-07-11', 'Prescription older than 30 days.'),
('RX-04', 'CUS-08', 'Arun Prakash', 'MED-09', 'Omeprazole 20mg', 1, 'Dr. R. Vignesh', '2026-08-15', 'RX-5108', 'Rejected', 'R. Rajan', '2026-08-16', 'Reference could not be verified with the issuing clinic.');

-- 17. Notifications
INSERT INTO `notifications` (`id`, `type`, `title`, `desc`, `time`, `read`, `branch_id`) VALUES
('N1', 'Low Stock', 'Low stock: Azithromycin 500mg', 'Kovilpatti Branch has only 6 strips remaining.', '2026-08-20 09:05 AM', FALSE, 'BR-01'),
('N2', 'Near Expiry', 'Batch expiring soon: MK4118', 'Pantoprazole 40mg batch expires in 18 days.', '2026-08-20 08:50 AM', FALSE, 'BR-01'),
('N3', 'New Purchase', 'Purchase received: SPD/INV/4471', 'Sun Pharma Distributors delivery confirmed at Kovilpatti.', '2026-08-19 04:12 PM', FALSE, 'BR-01'),
('N4', 'Reservation Created', 'New reservation: RSV-01', 'Suresh Babu reserved Human Mixtard Insulin (2 units).', '2026-08-19 02:30 PM', TRUE, 'BR-01'),
('N5', 'Reservation Expiring', 'Reservation expiring soon: RSV-02', 'Moxifloxacin Eye Drops reservation expires 2026-08-21.', '2026-08-19 11:00 AM', TRUE, 'BR-03'),
('N6', 'Expired Medicine', 'Batch expired: MK3103', 'Calcium + D3 Tablets batch has expired at Madurai Branch.', '2026-08-18 09:00 AM', TRUE, 'BR-03'),
('N7', 'Branch Availability', 'Stock transferred lookup', 'Tirunelveli Branch queried for Cetirizine 10mg availability.', '2026-08-18 03:45 PM', TRUE, 'BR-02'),
('N8', 'Reservation Cancelled', 'Reservation cancelled: RSV-05', 'Arun Prakash''s reservation for Metformin 500mg was cancelled.', '2026-08-17 01:15 PM', TRUE, 'BR-03');
