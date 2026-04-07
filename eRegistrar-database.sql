    CREATE DATABASE IF NOT EXISTS eRegistrar;
    USE eRegistrar;

    -- ===========================================================
    -- USERS & ROLES
    -- ===========================================================

    CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        account_type ENUM('student','alumni','admin','registrar','dean','college_admin','treasurer') NOT NULL,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB;

    CREATE TABLE roles ( 
        role_id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(100) UNIQUE NOT NULL,
        role_description TEXT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE user_roles (
        user_role_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        assigned_by INT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_role_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
        FOREIGN KEY (assigned_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE permissions (
        permission_id INT AUTO_INCREMENT PRIMARY KEY,
        permission_key VARCHAR(150) UNIQUE NOT NULL,
        permission_description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE role_permissions (
        role_permission_id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_role_permission (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE password_resets (
        reset_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE refresh_tokens (
        refresh_token_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        rotated_from_id INT NULL,
        ip_address VARCHAR(64) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (rotated_from_id) REFERENCES refresh_tokens(refresh_token_id)
    ) ENGINE=InnoDB;


    -- ===========================================================
    -- COURSES
    -- ===========================================================

    CREATE TABLE courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        course_description TEXT NULL,
        department VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- STUDENT PROFILES
    -- ===========================================================

    CREATE TABLE student_profiles (
        student_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,

        student_number VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NULL,
        last_name VARCHAR(100) NOT NULL,
        extension_name VARCHAR(50) NULL,

        birthdate DATE NULL,
        gender ENUM('male','female','other') NULL,
        contact_number VARCHAR(20) NULL,
        profile_picture VARCHAR(255) NULL,

        course_id INT NULL,

        year_level VARCHAR(100) NULL,
        enrollment_status ENUM('enrolled','graduated','dropped','transferred','alumni') DEFAULT 'enrolled',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- ADMIN PROFILES
    -- ===========================================================

    CREATE TABLE admin_profiles (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NULL,
        last_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- ADDRESS STRUCTURE
    -- ===========================================================

    CREATE TABLE provinces (
        province_id INT AUTO_INCREMENT PRIMARY KEY,
        province_name VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE municipalities (
        municipality_id INT AUTO_INCREMENT PRIMARY KEY,
        province_id INT NOT NULL,
        municipality_name VARCHAR(255) NOT NULL,
        FOREIGN KEY (province_id) REFERENCES provinces(province_id)
    ) ENGINE=InnoDB;

    CREATE TABLE barangays (
        barangay_id INT AUTO_INCREMENT PRIMARY KEY,
        municipality_id INT NOT NULL,
        barangay_name VARCHAR(255) NOT NULL,
        FOREIGN KEY (municipality_id) REFERENCES municipalities(municipality_id)
    ) ENGINE=InnoDB;

    CREATE TABLE student_addresses (
        address_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,

        address_type ENUM('current','permanent') NOT NULL,

        province_id INT NOT NULL,
        municipality_id INT NOT NULL,
        barangay_id INT NOT NULL,

        street TEXT NULL,
        postal_code VARCHAR(10) NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
        FOREIGN KEY (province_id) REFERENCES provinces(province_id),
        FOREIGN KEY (municipality_id) REFERENCES municipalities(municipality_id),
        FOREIGN KEY (barangay_id) REFERENCES barangays(barangay_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- GUARDIANS
    -- ===========================================================

    CREATE TABLE student_guardians (
        guardian_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,

        guardian_type ENUM('father','mother','guardian','other') NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NULL,
        occupation VARCHAR(255) NULL,
        email VARCHAR(255) NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- DOCUMENT TYPES & REQUESTS
    -- ===========================================================

    CREATE TABLE document_types (
        document_type_id INT AUTO_INCREMENT PRIMARY KEY,
        document_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        requirements TEXT NULL,
        estimated_processing_days INT NOT NULL DEFAULT 1,
        is_free_first_time TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

CREATE TABLE document_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    document_type_id INT NOT NULL,

    purpose VARCHAR(255) NOT NULL,
    delivery_method ENUM('pickup') NOT NULL,
    delivery_address TEXT NULL,
    quantity INT NOT NULL DEFAULT 1,

    total_amount DECIMAL(10,2) NOT NULL,

    request_status ENUM(
        'pending',
        'processing',
        'releasing',
        'completed',
        'rejected'
    ) DEFAULT 'pending',

    rejection_reason TEXT NULL,
    rejected_by INT NULL,
    rejected_at TIMESTAMP NULL,

    expires_at DATETIME NOT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    archived_at TIMESTAMP NULL,

    admin_id INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id),
    FOREIGN KEY (admin_id) REFERENCES admin_profiles(admin_id),
    FOREIGN KEY (rejected_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

CREATE TABLE request_status_logs (
    status_log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,

    status ENUM(
        'pending',
        'processing',
        'releasing',
        'completed',
        'rejected'
    ) NOT NULL,

    message TEXT NOT NULL,

    created_by INT NULL, -- NULL = system action
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (request_id) REFERENCES document_requests(request_id),
    FOREIGN KEY (created_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- PAYMENTS
    -- ===========================================================
    CREATE TABLE payment_methods (
        method_id INT AUTO_INCREMENT PRIMARY KEY,
        method_name VARCHAR(100) NOT NULL,   
        send_to VARCHAR(255) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,       
        is_active TINYINT(1) DEFAULT 1,       
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE payment_batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending','paid','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
    );


    CREATE TABLE payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NULL,
        request_id INT NULL,

        student_id INT NOT NULL,

        amount DECIMAL(10,2) NOT NULL,
        method_id INT NOT NULL,
        payment_proof VARCHAR(255) NULL,

        payment_status ENUM(
            'pending',
            'submitted',
            'verified',
            'rejected',
            'refunded'
        ) DEFAULT 'pending',

        verified_by INT NULL,
        verified_at TIMESTAMP NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (batch_id)
            REFERENCES payment_batches(batch_id)
            ON DELETE SET NULL,

        FOREIGN KEY (request_id)
            REFERENCES document_requests(request_id)
            ON DELETE SET NULL,

        FOREIGN KEY (student_id)
            REFERENCES student_profiles(student_id),

        FOREIGN KEY (method_id)
            REFERENCES payment_methods(method_id),

        FOREIGN KEY (verified_by)
            REFERENCES admin_profiles(admin_id)
    ) ENGINE=InnoDB;


CREATE TABLE batch_requests (
  batch_request_id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  request_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (batch_id)
    REFERENCES payment_batches(batch_id)
    ON DELETE CASCADE,

  FOREIGN KEY (request_id)
    REFERENCES document_requests(request_id)
    ON DELETE CASCADE,

  UNIQUE KEY uniq_batch_request (batch_id, request_id)
) ENGINE=InnoDB;



    -- ===========================================================
    -- REFUND REQUEST
    -- ===========================================================
    CREATE TABLE refund_requests (
    refund_id INT AUTO_INCREMENT PRIMARY KEY,

    payment_id INT NOT NULL,
    request_id INT NOT NULL,
    student_id INT NOT NULL,

    reason TEXT NOT NULL,

    refund_status ENUM(
        'pending',
        'approved',
        'denied',
        'released'
    ) DEFAULT 'pending',

    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    released_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (request_id) REFERENCES document_requests(request_id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (reviewed_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- RECIEPT
    -- ===========================================================
    CREATE TABLE receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,

    receipt_reference VARCHAR(50) NOT NULL UNIQUE,

    batch_id INT NOT NULL,
    student_id INT NOT NULL,

    total_paid DECIMAL(10,2) NOT NULL,
    completed_amount DECIMAL(10,2) NOT NULL,
    rejected_amount DECIMAL(10,2) NOT NULL,
    refundable_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    currency VARCHAR(10) NOT NULL DEFAULT 'PHP',

    issued_at DATETIME NOT NULL COMMENT 'Asia/Manila time',
    issued_by INT NULL COMMENT 'User who generated receipt',

    receipt_status ENUM(
        'issued',
        'voided'
    ) DEFAULT 'issued',

    pdf_path VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES payment_batches(batch_id),
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
    FOREIGN KEY (issued_by) REFERENCES users(user_id),

    UNIQUE KEY uniq_receipt_batch (batch_id)
) ENGINE=InnoDB;

CREATE TABLE receipt_items (
    receipt_item_id INT AUTO_INCREMENT PRIMARY KEY,

    receipt_id INT NOT NULL,
    request_id INT NOT NULL,

    document_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    request_status ENUM(
        'completed',
        'rejected'
    ) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id)
        ON DELETE CASCADE,

    FOREIGN KEY (request_id) REFERENCES document_requests(request_id)
) ENGINE=InnoDB;


    -- ===========================================================
    -- NOTIFICATIONS
    -- ===========================================================
    CREATE TABLE refund_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,

    refund_id INT NOT NULL,

    old_status ENUM('pending','approved','denied','released'),
    new_status ENUM('pending','approved','denied','released'),

    changed_by INT NULL,
    note TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (refund_id) REFERENCES refund_requests(refund_id),
    FOREIGN KEY (changed_by) REFERENCES admin_profiles(admin_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- NOTIFICATIONS
    -- ===========================================================

CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  type ENUM('request_update','payment_update','system') NOT NULL,

  status VARCHAR(50) NULL,  

  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

    -- ===========================================================
    -- SYSTEM SETTINGS (SCHOOL INFORMATION)
    -- ===========================================================
    CREATE TABLE system_settings (
        id INT PRIMARY KEY DEFAULT 1,

        school_name VARCHAR(255) NOT NULL,
        school_short_name VARCHAR(50) NOT NULL,
        school_email VARCHAR(255) NOT NULL,
        school_contact_number VARCHAR(50) NOT NULL,
        school_address TEXT NOT NULL,
        school_website VARCHAR(255) NULL,

        school_logo VARCHAR(255) NULL,
        school_seal VARCHAR(255) NULL,
        school_icon VARCHAR(255) NULL,

        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (updated_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;


    -- ===========================================================
    -- ANNOUNCEMENTS
    -- ===========================================================
    CREATE TABLE announcements (
        announcement_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        posted_by VARCHAR(255) NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL,

        FOREIGN KEY (created_by) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- AUDIT LOGS
    -- ===========================================================

    CREATE TABLE audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NULL,
        record_id INT NULL,
        old_value JSON NULL,
        new_value JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50) NULL,
        user_agent TEXT NULL,

        FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- Payment LOGS
    -- ===========================================================

    CREATE TABLE payment_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    old_status ENUM('pending','submitted','verified','rejected','refunded'),
    new_status ENUM('pending','submitted','verified','rejected','refunded'),
    changed_by INT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (changed_by) REFERENCES admin_profiles(admin_id)
    );

    -- Insert roles
    INSERT IGNORE INTO roles (role_name, role_description) VALUES
    ('admin', 'Full system administrator with all privileges'),
    ('student', 'Registered student user with limited access'),
    ('alumni', 'Graduate or alumni requester with portal access'),
    ('registrar', 'Registrar staff who manages course registrations and records'),
    ('dean', 'Academic approver limited by assigned scope'),
    ('college_admin', 'College administration reviewer limited by assigned college'),
    ('treasurer', 'Treasurer user who confirms payment outcomes');

    INSERT IGNORE INTO permissions (permission_key, permission_description) VALUES
    ('request.create', 'Create registrar workflow requests'),
    ('request.view.own', 'View own registrar workflow requests'),
    ('request.view.all', 'View all registrar workflow requests'),
    ('request.cancel.own', 'Cancel own registrar workflow request before terminal completion'),
    ('request.cancel.any', 'Cancel any registrar workflow request when policy allows'),
    ('request.verify', 'Perform registrar verification'),
    ('approval.dean.view', 'View dean approval queue'),
    ('approval.dean.approve', 'Approve dean-scoped requests'),
    ('approval.college_admin.view', 'View college administration review queue'),
    ('approval.college_admin.approve', 'Approve college administration scoped requests'),
    ('payment.assess', 'Assess fees before payment confirmation'),
    ('payment.submit.own', 'Submit own payment proof'),
    ('payment.confirm', 'Confirm payment as treasurer'),
    ('document.prepare', 'Prepare generated registrar output'),
    ('document.generate', 'Generate final registrar output'),
    ('document.view.own.allowed', 'View own generated document when policy allows'),
    ('document.release', 'Release generated registrar documents'),
    ('document.claim', 'Confirm claimed pickup release'),
    ('claim_stub.verify', 'Verify claim stubs during pickup release'),
    ('claim_stub.view.own', 'View own claim stub'),
    ('claim_stub.download.own', 'Download own claim stub'),
    ('notification.view.own', 'View own notifications'),
    ('admin.manage.users', 'Manage user accounts'),
    ('admin.manage.roles', 'Manage roles'),
    ('admin.manage.permissions', 'Manage permissions'),
    ('admin.manage.document_types', 'Manage document types'),
    ('admin.manage.templates', 'Manage document templates'),
    ('admin.manage.academic_structure', 'Manage academic routing structure'),
    ('audit.view', 'View audit logs'),
    ('reports.view', 'View reports');

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'request.create',
        'request.view.own',
        'request.cancel.own',
        'payment.submit.own',
        'document.view.own.allowed',
        'claim_stub.view.own',
        'claim_stub.download.own',
        'notification.view.own'
    )
    WHERE r.role_name = 'student';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'request.create',
        'request.view.own',
        'request.cancel.own',
        'payment.submit.own',
        'document.view.own.allowed',
        'claim_stub.view.own',
        'claim_stub.download.own',
        'notification.view.own'
    )
    WHERE r.role_name = 'alumni';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'request.view.all',
        'request.verify',
        'request.cancel.any',
        'payment.assess',
        'document.prepare',
        'document.generate',
        'document.release',
        'document.claim',
        'claim_stub.verify'
    )
    WHERE r.role_name = 'registrar';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'approval.dean.view',
        'approval.dean.approve'
    )
    WHERE r.role_name = 'dean';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'approval.college_admin.view',
        'approval.college_admin.approve'
    )
    WHERE r.role_name = 'college_admin';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'payment.confirm',
        'reports.view'
    )
    WHERE r.role_name = 'treasurer';

    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.permission_key IN (
        'request.view.all',
        'request.verify',
        'request.cancel.any',
        'approval.dean.view',
        'approval.dean.approve',
        'approval.college_admin.view',
        'approval.college_admin.approve',
        'payment.assess',
        'payment.confirm',
        'document.prepare',
        'document.generate',
        'document.release',
        'document.claim',
        'claim_stub.verify',
        'admin.manage.users',
        'admin.manage.roles',
        'admin.manage.permissions',
        'admin.manage.document_types',
        'admin.manage.templates',
        'admin.manage.academic_structure',
        'audit.view',
        'reports.view'
    )
    WHERE r.role_name = 'admin';

    -- SYSTEM SETTINGS (SCHOOL INFORMATION)
    INSERT INTO system_settings (
        school_name,
        school_short_name,
        school_email,
        school_contact_number,
        school_address,
        school_website,
        school_logo,
        school_seal,
        school_icon,
        updated_by
    ) VALUES (
        'Trinidad Municipal College',
        'TMC',
        'registrar@tmc.edu.ph',
        '+63 917 123 4567',
        'Poblacion, Trinidad, Bohol',
        'https://tmc.edu.ph',
        '/uploads/system/logo.png',
        '/uploads/system/seal.png',
        '/uploads/system/icon.png',
        NULL
    );

    -- ===========================================================
    -- WORKFLOW-NATIVE REGISTRAR PORTAL SCHEMA
    -- ===========================================================

    CREATE TABLE IF NOT EXISTS workflow_colleges (
        college_id INT AUTO_INCREMENT PRIMARY KEY,
        college_code VARCHAR(50) NULL,
        college_name VARCHAR(255) NOT NULL,
        UNIQUE KEY uniq_workflow_college_code (college_code),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_departments (
        department_id INT AUTO_INCREMENT PRIMARY KEY,
        college_id INT NOT NULL,
        department_code VARCHAR(50) NULL,
        department_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_workflow_department_code (college_id, department_code),
        FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_course_scopes (
        course_scope_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL UNIQUE,
        college_id INT NULL,
        department_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(course_id),
        FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id),
        FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_dean_assignments (
        dean_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NULL,
        department_id INT NULL,
        college_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id),
        FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id),
        FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_registrar_assignments (
        registrar_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NULL,
        department_id INT NULL,
        college_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id),
        FOREIGN KEY (department_id) REFERENCES workflow_departments(department_id),
        FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_college_admin_assignments (
        college_admin_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        college_id INT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_workflow_college_admin_assignment (user_id, college_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (college_id) REFERENCES workflow_colleges(college_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_requests (
        workflow_request_id INT AUTO_INCREMENT PRIMARY KEY,
        request_reference VARCHAR(50) NOT NULL UNIQUE,
        student_id INT NOT NULL,
        student_user_id INT NOT NULL,
        dean_user_id INT NULL,
        college_admin_user_id INT NULL,
        current_status VARCHAR(64) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        delivery_method VARCHAR(20) NOT NULL,
        form_snapshot_json JSON NOT NULL,
        educational_background_json JSON NOT NULL,
        academic_snapshot_json JSON NOT NULL,
        approval_snapshot_json JSON NULL,
        fee_snapshot_json JSON NULL,
        payment_snapshot_json JSON NULL,
        release_snapshot_json JSON NULL,
        rejection_reason TEXT NULL,
        rejected_by_role VARCHAR(100) NULL,
        rejected_at DATETIME NULL,
        cancellation_reason TEXT NULL,
        cancelled_by_role VARCHAR(100) NULL,
        cancelled_at DATETIME NULL,
        submitted_at DATETIME NOT NULL,
        completed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id),
        FOREIGN KEY (student_user_id) REFERENCES users(user_id),
        FOREIGN KEY (dean_user_id) REFERENCES users(user_id),
        FOREIGN KEY (college_admin_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_request_items (
        workflow_request_item_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        document_type_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        final_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_request_attachments (
        workflow_request_attachment_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        attachment_label VARCHAR(255) NULL,
        original_file_name VARCHAR(255) NOT NULL,
        stored_file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(120) NULL,
        file_size BIGINT NULL,
        uploaded_by_user_id INT NOT NULL,
        uploaded_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_request_actions (
        workflow_request_action_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        action_role VARCHAR(100) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        from_status VARCHAR(64) NULL,
        to_status VARCHAR(64) NULL,
        remarks TEXT NULL,
        payload_json JSON NULL,
        acted_by_user_id INT NOT NULL,
        acted_at DATETIME NOT NULL,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_request_approvals (
        workflow_request_approval_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        approval_stage VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        acted_by_user_id INT NOT NULL,
        remarks TEXT NULL,
        acted_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_fee_assessments (
        workflow_fee_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        assessment_version INT NOT NULL,
        base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        policy_type VARCHAR(64) NOT NULL DEFAULT 'ALWAYS_PAID',
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        waiver_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        surcharge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        final_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
        assessment_notes TEXT NULL,
        assessed_by_user_id INT NOT NULL,
        assessed_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (assessed_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_payment_submissions (
        workflow_payment_submission_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        payment_reference_number VARCHAR(120) NULL,
        payment_channel VARCHAR(120) NULL,
        proof_file_name VARCHAR(255) NULL,
        proof_file_path VARCHAR(500) NULL,
        submission_notes TEXT NULL,
        submitted_by_user_id INT NOT NULL,
        submitted_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (submitted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_generated_documents (
        workflow_generated_document_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        version_number INT NOT NULL,
        source_status VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        generated_by_user_id INT NOT NULL,
        generated_at DATETIME NOT NULL,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (generated_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_claim_stubs (
        workflow_claim_stub_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        claim_stub_number VARCHAR(100) NOT NULL UNIQUE,
        claim_stub_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        lookup_token_hash VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        generated_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        voided_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_release_records (
        workflow_release_record_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        workflow_generated_document_id INT NULL,
        release_method VARCHAR(32) NOT NULL,
        release_status VARCHAR(64) NOT NULL,
        prepared_by_user_id INT NULL,
        released_by_user_id INT NULL,
        released_at DATETIME NULL,
        recipient_name VARCHAR(255) NULL,
        recipient_email VARCHAR(255) NULL,
        authorized_representative_name VARCHAR(255) NULL,
        authorized_representative_id_type VARCHAR(100) NULL,
        authorized_representative_id_number VARCHAR(100) NULL,
        courier_name VARCHAR(255) NULL,
        tracking_number VARCHAR(255) NULL,
        dispatch_at DATETIME NULL,
        delivery_confirmed_at DATETIME NULL,
        claimant_type VARCHAR(50) NULL,
        claimant_relationship VARCHAR(100) NULL,
        claimant_id_type VARCHAR(100) NULL,
        claimant_id_number VARCHAR(100) NULL,
        authorization_letter_file_path VARCHAR(500) NULL,
        claimant_id_file_path VARCHAR(500) NULL,
        signature_file_path VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_generated_document_id) REFERENCES workflow_generated_documents(workflow_generated_document_id),
        FOREIGN KEY (prepared_by_user_id) REFERENCES users(user_id),
        FOREIGN KEY (released_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS workflow_release_claim_logs (
        workflow_release_claim_log_id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_request_id INT NOT NULL,
        workflow_release_record_id INT NULL,
        event_type VARCHAR(64) NOT NULL,
        remarks TEXT NULL,
        metadata_json JSON NULL,
        acted_by_user_id INT NOT NULL,
        acted_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workflow_request_id) REFERENCES workflow_requests(workflow_request_id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_release_record_id) REFERENCES workflow_release_records(workflow_release_record_id) ON DELETE SET NULL,
        FOREIGN KEY (acted_by_user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB;

    -- ===========================================================
    -- DEFAULT BOOTSTRAP DATA
    -- ===========================================================

    INSERT INTO users (email, password, account_type, status) VALUES
    ('admin@tmc.edu.ph', '$2b$10$ISlPEXvkErg85asxOf2g/.F0nkdKV9oRGk5deaACd104WOB3hMP66', 'admin', 'active'),
    ('registrar@tmc.edu.ph', '$2b$10$NaE8QRn699wic3nr7AQVl.91UOWoI.jd7L5swX1zst4mUCnzqB4VS', 'registrar', 'active'),
    ('dean@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('collegeadmin@tmc.edu.ph', '$2b$10$LKHRJIYDfAsbXI5Zol2FDumhg4xyx.5f4Ql0/P37a6a4T/OnLpvv2', 'college_admin', 'active'),
    ('treasurer@tmc.edu.ph', '$2b$10$rs89aL.8RjQu86ycypCEvuMPCGzrFz9O0AjvCXQDYCRSXmYYhJIKu', 'treasurer', 'active'),
    ('student@tmc.edu.ph', '$2b$10$w38ZrRYzw0UkpcHzPtVbLu9CM1kW5cHG5d.kdXnL9qpV8heAGPK1e', 'student', 'active'),
    ('alumni@tmc.edu.ph', '$2b$10$c5ocrXofbiCovGmvIxtjFuLEqBiFlU..ycByvqhXyS3t6Rvn7osOa', 'alumni', 'active'),
    ('clark.villamor@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('marina.polestico@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('elmira.negro@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('judith.austria@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('antonette.nugal@tmc.edu.ph', '$2b$10$d4ChO75V9KKS5T35bsC4au3b5DS18NEQV2PSgQP9w8XrdiWJH.RSK', 'dean', 'active'),
    ('julie.maestrado@tmc.edu.ph', '$2b$10$LKHRJIYDfAsbXI5Zol2FDumhg4xyx.5f4Ql0/P37a6a4T/OnLpvv2', 'college_admin', 'active'),
    ('iris.lloren@tmc.edu.ph', '$2b$10$NaE8QRn699wic3nr7AQVl.91UOWoI.jd7L5swX1zst4mUCnzqB4VS', 'registrar', 'active')
    ON DUPLICATE KEY UPDATE
        password = VALUES(password),
        account_type = VALUES(account_type),
        status = VALUES(status);

    INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
    SELECT u.user_id, r.role_id, CASE WHEN u.email IN ('admin@tmc.edu.ph', 'student@tmc.edu.ph') THEN NULL ELSE admin_user.user_id END
    FROM users u
    JOIN roles r ON r.role_name =
      CASE
        WHEN u.email = 'admin@tmc.edu.ph' THEN 'admin'
        WHEN u.email IN ('registrar@tmc.edu.ph', 'iris.lloren@tmc.edu.ph') THEN 'registrar'
        WHEN u.email IN ('dean@tmc.edu.ph', 'clark.villamor@tmc.edu.ph', 'marina.polestico@tmc.edu.ph', 'elmira.negro@tmc.edu.ph', 'judith.austria@tmc.edu.ph', 'antonette.nugal@tmc.edu.ph') THEN 'dean'
        WHEN u.email IN ('collegeadmin@tmc.edu.ph', 'julie.maestrado@tmc.edu.ph') THEN 'college_admin'
        WHEN u.email = 'treasurer@tmc.edu.ph' THEN 'treasurer'
        WHEN u.email = 'student@tmc.edu.ph' THEN 'student'
        WHEN u.email = 'alumni@tmc.edu.ph' THEN 'alumni'
      END
    LEFT JOIN users admin_user ON admin_user.email = 'admin@tmc.edu.ph'
    WHERE u.email IN (
      'admin@tmc.edu.ph',
      'registrar@tmc.edu.ph',
      'dean@tmc.edu.ph',
      'collegeadmin@tmc.edu.ph',
      'treasurer@tmc.edu.ph',
      'student@tmc.edu.ph',
      'alumni@tmc.edu.ph',
      'clark.villamor@tmc.edu.ph',
      'marina.polestico@tmc.edu.ph',
      'elmira.negro@tmc.edu.ph',
      'judith.austria@tmc.edu.ph',
      'antonette.nugal@tmc.edu.ph',
      'julie.maestrado@tmc.edu.ph',
      'iris.lloren@tmc.edu.ph'
    );

    INSERT INTO courses (course_code, course_name, course_description, department) VALUES
    ('BSIT', 'Bachelor of Science in Information Technology', 'Default seeded BSIT program for registrar workflow routing.', 'Department of Information Technology'),
    ('BSBA', 'Bachelor of Science in Business Administration', 'Default seeded BSBA program for registrar workflow routing.', 'Department of Business Administration'),
    ('ABPOLSCI', 'Bachelor of Arts in Political Science', 'Default seeded AB Political Science program for College of Arts and Sciences routing.', 'College of Arts and Sciences'),
    ('BSCRIM', 'Bachelor of Science in Criminology', 'Default seeded BS Criminology program for College of Criminal Justice Education routing.', 'College of Criminal Justice Education'),
    ('BSOA', 'Bachelor of Science in Office Administration', 'Default seeded BSOA program for College of Office Administration routing.', 'College of Office Administration'),
    ('BSED', 'Bachelor of Secondary Education', 'Default seeded BSED program for College of Education routing.', 'College of Education'),
    ('BEED', 'Bachelor of Elementary Education', 'Default seeded BEED program for College of Education routing.', 'College of Education')
    ON DUPLICATE KEY UPDATE
        course_name = VALUES(course_name),
        course_description = VALUES(course_description),
        department = VALUES(department);

    INSERT INTO admin_profiles (user_id, first_name, middle_name, last_name, contact_number)
    SELECT u.user_id, v.first_name, v.middle_name, v.last_name, v.contact_number
    FROM users u
    JOIN (
      SELECT 'admin@tmc.edu.ph' AS email, 'System' AS first_name, NULL AS middle_name, 'Administrator' AS last_name, '09170000001' AS contact_number
      UNION ALL SELECT 'registrar@tmc.edu.ph', 'Rina', NULL, 'Registrar', '09170000002'
      UNION ALL SELECT 'dean@tmc.edu.ph', 'Dario', NULL, 'Dean', '09170000003'
      UNION ALL SELECT 'collegeadmin@tmc.edu.ph', 'Celia', NULL, 'Administrator', '09170000004'
      UNION ALL SELECT 'treasurer@tmc.edu.ph', 'Teresa', NULL, 'Treasurer', '09170000006'
      UNION ALL SELECT 'clark.villamor@tmc.edu.ph', 'Clark', 'Kevin V.', 'Villamor', '09170000007'
      UNION ALL SELECT 'marina.polestico@tmc.edu.ph', 'Marina', 'C.', 'Polestico', '09170000008'
      UNION ALL SELECT 'elmira.negro@tmc.edu.ph', 'Elmira', 'O.', 'Negro', '09170000009'
      UNION ALL SELECT 'judith.austria@tmc.edu.ph', 'Judith', 'V.', 'Austria', '09170000010'
      UNION ALL SELECT 'antonette.nugal@tmc.edu.ph', 'Antonette', 'T.', 'Nugal', '09170000011'
      UNION ALL SELECT 'julie.maestrado@tmc.edu.ph', 'Julie', 'T.', 'Maestrado', '09170000012'
      UNION ALL SELECT 'iris.lloren@tmc.edu.ph', 'Iris Mae', 'C.', 'Lloren', '09170000013'
    ) v ON v.email = u.email
    ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        middle_name = VALUES(middle_name),
        last_name = VALUES(last_name),
        contact_number = VALUES(contact_number);

    INSERT INTO workflow_colleges (college_code, college_name) VALUES
    ('CHE', 'College of Higher Education'),
    ('CCS', 'College of Computer Studies'),
    ('CAS', 'College of Arts and Sciences'),
    ('CCJE', 'College of Criminal Justice Education'),
    ('COA', 'College of Office Administration'),
    ('COE', 'College of Education')
    ON DUPLICATE KEY UPDATE
        college_name = VALUES(college_name);

    INSERT INTO workflow_departments (college_id, department_code, department_name)
    SELECT wc.college_id, v.department_code, v.department_name
    FROM workflow_colleges wc
    JOIN (
      SELECT 'CHE' AS college_code, 'DIT' AS department_code, 'Department of Information Technology' AS department_name
      UNION ALL SELECT 'CHE', 'DBA', 'Department of Business Administration'
      UNION ALL SELECT 'CCS', 'DCS', 'Department of Computer Studies'
      UNION ALL SELECT 'CAS', 'CAS', 'College of Arts and Sciences'
      UNION ALL SELECT 'CCJE', 'CCJE', 'College of Criminal Justice Education'
      UNION ALL SELECT 'COA', 'COA', 'College of Office Administration'
      UNION ALL SELECT 'COE', 'COE', 'College of Education'
    ) v ON v.college_code = wc.college_code
    WHERE NOT EXISTS (
      SELECT 1 FROM workflow_departments wd
      WHERE wd.college_id = wc.college_id AND wd.department_code = v.department_code
    );

    INSERT INTO workflow_course_scopes (course_id, college_id, department_id)
    SELECT c.course_id, wc.college_id, wd.department_id
    FROM courses c
    JOIN (
      SELECT 'BSIT' AS course_code, 'CCS' AS college_code, 'DCS' AS department_code
      UNION ALL SELECT 'BSBA', 'CHE', 'DBA'
      UNION ALL SELECT 'ABPOLSCI', 'CAS', 'CAS'
      UNION ALL SELECT 'BSCRIM', 'CCJE', 'CCJE'
      UNION ALL SELECT 'BSOA', 'COA', 'COA'
      UNION ALL SELECT 'BSED', 'COE', 'COE'
      UNION ALL SELECT 'BEED', 'COE', 'COE'
    ) v ON v.course_code = c.course_code
    JOIN workflow_colleges wc ON wc.college_code = v.college_code
    JOIN workflow_departments wd ON wd.college_id = wc.college_id AND wd.department_code = v.department_code
    ON DUPLICATE KEY UPDATE
        college_id = VALUES(college_id),
        department_id = VALUES(department_id);

    INSERT INTO workflow_dean_assignments (user_id, course_id, department_id, college_id, is_active)
    SELECT u.user_id, c.course_id, wcs.department_id, wcs.college_id, 1
    FROM users u
    JOIN (
      SELECT 'dean@tmc.edu.ph' AS email, 'BSBA' AS course_code
      UNION ALL SELECT 'clark.villamor@tmc.edu.ph', 'BSIT'
      UNION ALL SELECT 'marina.polestico@tmc.edu.ph', 'ABPOLSCI'
      UNION ALL SELECT 'elmira.negro@tmc.edu.ph', 'BSCRIM'
      UNION ALL SELECT 'judith.austria@tmc.edu.ph', 'BSOA'
      UNION ALL SELECT 'antonette.nugal@tmc.edu.ph', 'BSED'
      UNION ALL SELECT 'antonette.nugal@tmc.edu.ph', 'BEED'
    ) v ON v.email = u.email
    JOIN courses c ON c.course_code = v.course_code
    JOIN workflow_course_scopes wcs ON wcs.course_id = c.course_id
    WHERE NOT EXISTS (
      SELECT 1 FROM workflow_dean_assignments wda
      WHERE wda.user_id = u.user_id AND wda.course_id = c.course_id
    );

    UPDATE workflow_dean_assignments wda
    JOIN users u ON u.user_id = wda.user_id
    JOIN courses c ON c.course_id = wda.course_id
    SET wda.is_active = 0
    WHERE u.email = 'dean@tmc.edu.ph' AND c.course_code = 'BSIT';

    INSERT INTO workflow_college_admin_assignments (user_id, college_id, is_active)
    SELECT u.user_id, wc.college_id, 1
    FROM users u
    JOIN workflow_colleges wc ON wc.college_code IN ('CHE', 'CCS', 'CAS', 'CCJE', 'COA', 'COE')
    WHERE u.email IN ('collegeadmin@tmc.edu.ph', 'julie.maestrado@tmc.edu.ph')
      AND NOT EXISTS (
        SELECT 1 FROM workflow_college_admin_assignments wcaa
        WHERE wcaa.user_id = u.user_id AND wcaa.college_id = wc.college_id
      );
