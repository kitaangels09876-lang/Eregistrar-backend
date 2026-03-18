USE eRegistrar;

-- ===========================================================
-- 1. ROLES
-- ===========================================================
INSERT IGNORE INTO roles (role_name, role_description) VALUES
('admin', 'Full system administrator'),
('student', 'Student user'),
('registrar', 'Registrar staff');

-- ===========================================================
-- 2. USERS
-- password = password123
-- ===========================================================
INSERT INTO users (email, password, account_type, status) VALUES
('admin@tmc.edu.ph',
 '$2y$10$LoFkpMnAeySAYxhiwdV49uZHPLCyZpdFAd4wQneQyxdUehKT5pP0S',
 'admin', 'active'),

('registrar@tmc.edu.ph',
 '$2y$10$LoFkpMnAeySAYxhiwdV49uZHPLCyZpdFAd4wQneQyxdUehKT5pP0S',
 'registrar', 'active'),

('student1@tmc.edu.ph',
 '$2y$10$LoFkpMnAeySAYxhiwdV49uZHPLCyZpdFAd4wQneQyxdUehKT5pP0S',
 'student', 'active'),

('student2@tmc.edu.ph',
 '$2y$10$LoFkpMnAeySAYxhiwdV49uZHPLCyZpdFAd4wQneQyxdUehKT5pP0S',
 'student', 'active');

-- ===========================================================
-- 3. USER ROLES
-- ===========================================================
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1, 1, NULL),
(2, 3, 1),
(3, 2, 1),
(4, 2, 1);

-- ===========================================================
-- 4. COURSES
-- ===========================================================
INSERT INTO courses (course_code, course_name, department) VALUES
('BSIT', 'Bachelor of Science in Information Technology', 'College of Computing'),
('BSBA', 'Bachelor of Science in Business Administration', 'College of Business');

-- ===========================================================
-- 5. ADMIN PROFILES
-- ===========================================================
INSERT INTO admin_profiles (user_id, first_name, last_name, contact_number) VALUES
(1, 'System', 'Administrator', '09170000001'),
(2, 'Jane', 'Registrar', '09170000002');

-- ===========================================================
-- 6. STUDENT PROFILES
-- ===========================================================
INSERT INTO student_profiles (
 user_id, student_number, first_name, last_name,
 gender, contact_number, course_id, year_level
) VALUES
(3, '2024-0001', 'Juan', 'Dela Cruz', 'male', '09990000001', 1, '1st'),
(4, '2024-0002', 'Maria', 'Santos', 'female', '09990000002', 2, '2nd');

-- ===========================================================
-- 7. ADDRESS STRUCTURE
-- ===========================================================
INSERT INTO provinces (province_name) VALUES ('Bohol');
INSERT INTO municipalities (province_id, municipality_name) VALUES (1, 'Trinidad');
INSERT INTO barangays (municipality_id, barangay_name) VALUES (1, 'Poblacion');

INSERT INTO student_addresses (
 student_id, address_type,
 province_id, municipality_id, barangay_id,
 street, postal_code
) VALUES
(1, 'current', 1, 1, 1, 'Rizal St.', '6304'),
(2, 'current', 1, 1, 1, 'Bonifacio St.', '6304');

-- ===========================================================
-- 8. GUARDIANS
-- ===========================================================
INSERT INTO student_guardians (
 student_id, guardian_type, first_name, last_name,
 contact_number, occupation
) VALUES
(1, 'father', 'Pedro', 'Dela Cruz', '09171111111', 'Farmer'),
(2, 'mother', 'Ana', 'Santos', '09172222222', 'Teacher');

-- ===========================================================
-- 9. DOCUMENT TYPES
-- ===========================================================
INSERT INTO document_types (
 document_name, description, base_price,
 requirements, estimated_processing_days
) VALUES
('Transcript of Records', 'Official TOR', 150.00, 'Clearance', 5),
('Certificate of Enrollment', 'Enrollment proof', 50.00, NULL, 2);

-- ===========================================================
-- 10. DOCUMENT REQUESTS
-- ===========================================================
INSERT INTO document_requests (
 student_id, document_type_id,
 purpose, delivery_method, quantity,
 total_amount, request_status,
 expires_at, admin_id
) VALUES
(1, 1, 'Employment', 'pickup', 2, 300.00, 'processing',
 DATE_ADD(NOW(), INTERVAL 7 DAY), 2),

(1, 2, 'Scholarship', 'pickup', 1, 50.00, 'rejected',
 DATE_ADD(NOW(), INTERVAL 3 DAY), 2);

-- ===========================================================
-- 11. REQUEST STATUS LOGS
-- ===========================================================
INSERT INTO request_status_logs (
 request_id, status, message, created_by
) VALUES
(1, 'processing', 'Processing started', 2),
(2, 'rejected', 'Rejected due to missing records', 2);

-- ===========================================================
-- 12. PAYMENT METHODS
-- ===========================================================
INSERT INTO payment_methods (method_name, send_to, sender_name) VALUES
('GCash', '09170000001', 'TMC Cashier'),
('Cash', 'Onsite', 'Registrar Office');

-- ===========================================================
-- 13. PAYMENT BATCH
-- ===========================================================
INSERT INTO payment_batches (student_id, total_amount, status) VALUES
(1, 350.00, 'paid');

-- ===========================================================
-- 14. BATCH REQUESTS
-- ===========================================================
INSERT INTO batch_requests (batch_id, request_id) VALUES
(1, 1),
(1, 2);

-- ===========================================================
-- 15. PAYMENTS
-- ===========================================================
INSERT INTO payments (
 batch_id, student_id, amount, method_id,
 payment_proof, payment_status, verified_by, verified_at
) VALUES
(1, 1, 350.00, 1,
 '/uploads/payments/batch1.png',
 'verified', 2, NOW());

-- ===========================================================
-- 16. PAYMENT LOGS
-- ===========================================================
INSERT INTO payment_logs (
 payment_id, old_status, new_status, changed_by, note
) VALUES
(1, 'submitted', 'verified', 2, 'Batch payment verified');

-- ===========================================================
-- 17. COMPLETE DOCUMENT
-- ===========================================================
UPDATE document_requests
SET request_status = 'completed'
WHERE request_id = 1;

INSERT INTO request_status_logs (
 request_id, status, message, created_by
) VALUES
(1, 'completed', 'Document released successfully', 2);

-- ===========================================================
-- 18. REFUND REQUEST
-- ===========================================================
INSERT INTO refund_requests (
 payment_id, request_id, student_id,
 reason, refund_status, reviewed_by, reviewed_at
) VALUES
(1, 2, 1,
 'Request rejected after payment',
 'approved', 1, NOW());

-- ===========================================================
-- 19. REFUND LOGS
-- ===========================================================
INSERT INTO refund_logs (
 refund_id, old_status, new_status, changed_by, note
) VALUES
(1, 'pending', 'approved', 1, 'Refund approved');

-- ===========================================================
-- 20. RECEIPT (FINAL OUTPUT)
-- ===========================================================
INSERT INTO receipts (
 receipt_reference, batch_id, student_id,
 total_paid, completed_amount,
 rejected_amount, refundable_amount,
 currency, issued_at, issued_by,
 receipt_status, pdf_path
) VALUES (
 'REC-1-20250210-A1B2',
 1,
 1,
 350.00,
 300.00,
 50.00,
 50.00,
 'PHP',
 CONVERT_TZ(NOW(), '+00:00', '+08:00'),
 2,
 'issued',
 '/uploads/receipts/receipt-REC-1-20250210-A1B2.pdf'
);

-- ===========================================================
-- 21. RECEIPT ITEMS
-- ===========================================================
INSERT INTO receipt_items (
 receipt_id, request_id,
 document_name, quantity,
 amount, request_status
) VALUES
(1, 1, 'Transcript of Records', 2, 300.00, 'completed'),
(1, 2, 'Certificate of Enrollment', 1, 50.00, 'rejected');

-- ===========================================================
-- 22. NOTIFICATIONS
-- ===========================================================
INSERT INTO notifications (
 user_id, title, message, type, status
) VALUES
(3, 'Refund Approved', 'Your refund has been approved.', 'payment_update', 'approved'),
(3, 'Request Completed', 'Your document is ready for release.', 'request_update', 'completed');

-- ===========================================================
-- 23. SYSTEM SETTINGS
-- ===========================================================
INSERT INTO system_settings (
 id, school_name, school_short_name,
 school_email, school_contact_number,
 school_address, school_website,
 school_logo, school_seal, school_icon,
 updated_by
) VALUES (
 1,
 'Trinidad Municipal College',
 'TMC',
 'registrar@tmc.edu.ph',
 '+63 917 123 4567',
 'Poblacion, Trinidad, Bohol',
 'https://tmc.edu.ph',
 '/uploads/system/logo.png',
 '/uploads/system/seal.png',
 '/uploads/system/icon.png',
 1
)
ON DUPLICATE KEY UPDATE
 school_name = VALUES(school_name),
 school_short_name = VALUES(school_short_name),
 school_email = VALUES(school_email),
 school_contact_number = VALUES(school_contact_number),
 school_address = VALUES(school_address),
 school_website = VALUES(school_website),
 school_logo = VALUES(school_logo),
 school_seal = VALUES(school_seal),
 school_icon = VALUES(school_icon),
 updated_by = VALUES(updated_by);

-- ===========================================================
-- 24. ANNOUNCEMENTS
-- ===========================================================
INSERT INTO announcements (
 title, start_date, end_date,
 message, posted_by, created_by
) VALUES
('Enrollment Open',
 CURDATE(),
 DATE_ADD(CURDATE(), INTERVAL 30 DAY),
 'Enrollment is now open for SY 2025.',
 'Registrar Office',
 1);

-- ===========================================================
-- 25. AUDIT LOGS
-- ===========================================================
INSERT INTO audit_logs (
 user_id, action, table_name, record_id,
 new_value, ip_address, user_agent
) VALUES
(1, 'APPROVE_REFUND', 'refund_requests', 1,
 JSON_OBJECT('status','approved'),
 '127.0.0.1', 'Seeder'),

(2, 'RECEIPT_ISSUED', 'receipts', 1,
 JSON_OBJECT(
   'receipt_reference','REC-1-20250210-A1B2',
   'total_paid',350.00,
   'refundable_amount',50.00
 ),
 '127.0.0.1', 'Seeder');
